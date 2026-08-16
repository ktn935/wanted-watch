import WidgetKit
import SwiftUI
import CoreLocation

// MARK: - Firestore REST デコード用の型
// Firestoreの一覧取得APIは {fields: {name: {stringValue: "..."}}} のような
// 型付きの形式でフィールドを返すため、専用のデコーダを用意する。

private struct FirestoreListResponse: Decodable {
    let documents: [FirestoreDocument]?
}

private struct FirestoreDocument: Decodable {
    let name: String?
    let fields: [String: FirestoreValue]
    let updateTime: String?
}

private struct FirestoreGeoPoint: Decodable {
    let latitude: Double
    let longitude: Double
}

private struct FirestoreValue: Decodable {
    let stringValue: String?
    let geoPointValue: FirestoreGeoPoint?
}

// MARK: - アプリ内で扱う被疑者情報

struct WantedSuspect {
    let id: String
    let suspectName: String?
    let title: String?
    let stationName: String?
    let photoUrl: String?
    let sourceUrl: String
    let location: CLLocation?
    var distanceKm: Double?
    var isFavorite: Bool = false
}

private let firestoreListURL =
    "https://firestore.googleapis.com/v1/projects/wanted-watch-d7b14/databases/(default)/documents/wantedSuspects?pageSize=50&orderBy=updatedAt%20desc"

private let appGroupId = "group.com.ktn935.wantedwatch"

// アプリ側(FavoritesContext)がApp Group経由で書き込むお気に入りIDの一覧を読み込む
private func loadFavoriteIds() -> Set<String> {
    guard let json = UserDefaults(suiteName: appGroupId)?.string(forKey: "favoriteIds"),
          let data = json.data(using: .utf8),
          let ids = try? JSONDecoder().decode([String].self, from: data) else {
        return []
    }
    return Set(ids)
}

private func fetchSuspects() async -> (suspects: [WantedSuspect], debugError: String?) {
    guard let url = URL(string: firestoreListURL) else {
        return ([], "URL構築失敗")
    }
    do {
        // ウィジェットの処理時間予算は短いため、デフォルト(60秒)より
        // 十分短いタイムアウトを明示的に設定する。
        var request = URLRequest(url: url)
        request.timeoutInterval = 5
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            let bodyPreview = String(data: data.prefix(200), encoding: .utf8) ?? ""
            return ([], "HTTP \(http.statusCode): \(bodyPreview)")
        }
        let decoded = try JSONDecoder().decode(FirestoreListResponse.self, from: data)
        let suspects = (decoded.documents ?? []).compactMap { doc -> WantedSuspect? in
            guard let sourceUrl = doc.fields["sourceUrl"]?.stringValue else { return nil }
            // Firestoreの"name"は "projects/.../documents/wantedSuspects/{docId}" の形式。
            // {docId}はJS側(functions/writeToFirestore.js)のidと同じ値。
            guard let docId = doc.name?.split(separator: "/").last.map(String.init) else { return nil }
            var location: CLLocation?
            if let geo = doc.fields["location"]?.geoPointValue {
                location = CLLocation(latitude: geo.latitude, longitude: geo.longitude)
            }
            return WantedSuspect(
                id: docId,
                suspectName: doc.fields["suspectName"]?.stringValue,
                title: doc.fields["title"]?.stringValue,
                stationName: doc.fields["stationName"]?.stringValue,
                photoUrl: doc.fields["photoUrl"]?.stringValue,
                sourceUrl: sourceUrl,
                location: location,
                distanceKm: nil
            )
        }
        if suspects.isEmpty, !(decoded.documents ?? []).isEmpty {
            return ([], "取得0件(全件パース失敗, documents=\((decoded.documents ?? []).count))")
        }
        return (suspects, nil)
    } catch {
        return ([], "取得エラー: \(error)")
    }
}

// 現在地を1回だけ取得する。メインアプリで位置情報の利用が許可されていれば、
// ウィジェット(同じアプリのApple ID権限を共有)からも取得できる。
// 許可されていない/取得できない場合はnilを返し、呼び出し側は現在地無しの並び順にフォールバックする。
private final class OneShotLocationFetcher: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var continuation: CheckedContinuation<CLLocation?, Never>?

    func fetch() async -> CLLocation? {
        let status = manager.authorizationStatus
        guard status == .authorizedWhenInUse || status == .authorizedAlways else {
            return nil
        }
        // requestLocation()がdidUpdateLocations/didFailWithErrorのどちらも呼ばないまま
        // 応答しないケースがあり、その場合ウィジェットの処理時間予算を超えて
        // 「読み込み中」のまま固まって見えてしまう。3秒でタイムアウトして
        // 現在地無し(nil)にフォールバックする。
        return await withTaskGroup(of: CLLocation?.self) { group in
            group.addTask {
                await withCheckedContinuation { continuation in
                    self.continuation = continuation
                    self.manager.delegate = self
                    self.manager.requestLocation()
                }
            }
            group.addTask {
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                return nil
            }
            let result = await group.next() ?? nil
            group.cancelAll()
            return result
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        continuation?.resume(returning: locations.first)
        continuation = nil
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        continuation?.resume(returning: nil)
        continuation = nil
    }
}

private func loadImage(urlString: String?) async -> UIImage? {
    guard let urlString, let url = URL(string: urlString) else { return nil }
    var request = URLRequest(url: url)
    request.timeoutInterval = 5
    guard let (data, _) = try? await URLSession.shared.data(for: request) else { return nil }
    return UIImage(data: data)
}

// MARK: - Timeline

struct WantedEntry: TimelineEntry {
    let date: Date
    let suspect: WantedSuspect?
    let image: UIImage?
    var debugMessage: String? = nil
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> WantedEntry {
        WantedEntry(date: Date(), suspect: nil, image: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (WantedEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WantedEntry>) -> Void) {
        Task {
            // 個々の通信・位置情報取得にタイムアウトを設けていても、想定外の要因で
            // 全体として固まってしまう可能性はゼロにできない。ウィジェットが
            // 「読み込み中」のまま表示され続けることだけは避けたいので、
            // 全体にも上限時間を設け、超えたら最低限のフォールバック表示にする。
            let timeline = await withTaskGroup(of: Timeline<WantedEntry>?.self) { group in
                group.addTask { await self.buildTimeline() }
                group.addTask {
                    try? await Task.sleep(nanoseconds: 12_000_000_000)
                    return Timeline(
                        entries: [WantedEntry(date: Date(), suspect: nil, image: nil, debugMessage: "タイムアウトしました")],
                        policy: .after(Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date())
                    )
                }
                let result = await group.next() ?? nil
                group.cancelAll()
                return result ?? Timeline(entries: [WantedEntry(date: Date(), suspect: nil, image: nil, debugMessage: "タイムアウトしました")], policy: .after(Date()))
            }
            completion(timeline)
        }
    }

    private func buildTimeline() async -> Timeline<WantedEntry> {
        let fetchResult = await fetchSuspects()
        var suspects = fetchResult.suspects
        let currentLocation = await OneShotLocationFetcher().fetch()

        if let currentLocation {
            // 現在地が取れた場合は、位置情報を持つ被疑者を近い順に並べ、
            // 位置情報が無いものは末尾に回す。
            suspects = suspects.map { suspect in
                var copy = suspect
                if let location = suspect.location {
                    copy.distanceKm = currentLocation.distance(from: location) / 1000
                }
                return copy
            }
            suspects.sort { a, b in
                switch (a.distanceKm, b.distanceKm) {
                case let (da?, db?): return da < db
                case (nil, nil): return false
                case (nil, _): return false
                case (_, nil): return true
                }
            }
        }

        // ローテーション対象を組み立てる: 先頭は必ず現在地から最も近い1件(基本ケース)、
        // 続けてお気に入り登録された被疑者(近い順に含まれていない分)を追加する。
        let favoriteIds = loadFavoriteIds()
        var rotationSuspects: [WantedSuspect] = []
        var seenIds = Set<String>()

        for suspect in suspects.prefix(3) {
            guard !seenIds.contains(suspect.id) else { continue }
            var copy = suspect
            copy.isFavorite = favoriteIds.contains(suspect.id)
            rotationSuspects.append(copy)
            seenIds.insert(suspect.id)
        }
        for suspect in suspects where favoriteIds.contains(suspect.id) {
            guard rotationSuspects.count < 5, !seenIds.contains(suspect.id) else { continue }
            var copy = suspect
            copy.isFavorite = true
            rotationSuspects.append(copy)
            seenIds.insert(suspect.id)
        }

        let now = Date()
        var entries: [WantedEntry] = []

        if rotationSuspects.isEmpty {
            let message = fetchResult.debugError ?? "被疑者データが0件でした"
            entries.append(WantedEntry(date: now, suspect: nil, image: nil, debugMessage: message))
        } else {
            for (index, suspect) in rotationSuspects.enumerated() {
                let entryDate = Calendar.current.date(byAdding: .minute, value: index * 15, to: now) ?? now
                let image = await loadImage(urlString: suspect.photoUrl)
                entries.append(WantedEntry(date: entryDate, suspect: suspect, image: image))
            }
        }

        let refreshDate = Calendar.current.date(byAdding: .hour, value: 1, to: now) ?? now
        return Timeline(entries: entries, policy: .after(refreshDate))
    }
}

// MARK: - View

struct widgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    // アプリ本体と統一したダーク基調の配色
    private let accent = Color(red: 1.0, green: 0.549, blue: 0.0) // #ff8c00
    private let danger = Color(red: 0.843, green: 0.149, blue: 0.239) // #d7263d
    private let muted = Color(white: 0.6)

    var body: some View {
        if let suspect = entry.suspect {
            HStack(alignment: .top, spacing: 8) {
                if let uiImage = entry.image {
                    Image(uiImage: uiImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 56, height: 56)
                        .clipped()
                } else {
                    Rectangle()
                        .fill(Color(white: 0.1))
                        .frame(width: 56, height: 56)
                        .overlay(Image(systemName: "person.fill").foregroundColor(muted))
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 4) {
                        Text(suspect.suspectName ?? "不明")
                            .font(.headline)
                            .foregroundColor(.white)
                            .lineLimit(1)
                        if suspect.isFavorite {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundColor(accent)
                        }
                    }
                    Text(suspect.title ?? "不明")
                        .font(.caption)
                        .foregroundColor(accent)
                        .lineLimit(family == .systemSmall ? 1 : 2)
                    if let distanceKm = suspect.distanceKm {
                        Text(String(format: "現在地から約%.1fkm", distanceKm))
                            .font(.caption2)
                            .foregroundColor(danger)
                    }
                    if family != .systemSmall, let stationName = suspect.stationName {
                        Text("管轄: \(stationName)")
                            .font(.caption2)
                            .foregroundColor(muted)
                            .lineLimit(1)
                    }
                }
                Spacer()
            }
            .padding(12)
            .containerBackground(Color.black, for: .widget)
        } else {
            VStack(spacing: 4) {
                Text("指名手配ウォッチ")
                    .font(.caption)
                    .foregroundColor(.white)
                Text(entry.debugMessage ?? "データを取得できませんでした")
                    .font(.caption2)
                    .foregroundColor(muted)
                    .lineLimit(4)
                    .multilineTextAlignment(.center)
            }
            .padding(12)
            .containerBackground(Color.black, for: .widget)
        }
    }
}

struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            widgetEntryView(entry: entry)
        }
        .configurationDisplayName("指名手配ウォッチ")
        .description("現在地から近い指名手配情報を表示します。")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemMedium) {
    widget()
} timeline: {
    WantedEntry(date: .now, suspect: nil, image: nil)
}
