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
    let suspectName: String?
    let title: String?
    let stationName: String?
    let photoUrl: String?
    let sourceUrl: String
    let location: CLLocation?
    var distanceKm: Double?
}

private let firestoreListURL =
    "https://firestore.googleapis.com/v1/projects/wanted-watch-d7b14/databases/(default)/documents/wantedSuspects?pageSize=50&orderBy=updatedAt%20desc"

private func fetchSuspects() async -> [WantedSuspect] {
    guard let url = URL(string: firestoreListURL) else { return [] }
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(FirestoreListResponse.self, from: data)
        return (response.documents ?? []).compactMap { doc -> WantedSuspect? in
            guard let sourceUrl = doc.fields["sourceUrl"]?.stringValue else { return nil }
            var location: CLLocation?
            if let geo = doc.fields["location"]?.geoPointValue {
                location = CLLocation(latitude: geo.latitude, longitude: geo.longitude)
            }
            return WantedSuspect(
                suspectName: doc.fields["suspectName"]?.stringValue,
                title: doc.fields["title"]?.stringValue,
                stationName: doc.fields["stationName"]?.stringValue,
                photoUrl: doc.fields["photoUrl"]?.stringValue,
                sourceUrl: sourceUrl,
                location: location,
                distanceKm: nil
            )
        }
    } catch {
        return []
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
        return await withCheckedContinuation { continuation in
            self.continuation = continuation
            manager.delegate = self
            manager.requestLocation()
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
    guard let (data, _) = try? await URLSession.shared.data(from: url) else { return nil }
    return UIImage(data: data)
}

// MARK: - Timeline

struct WantedEntry: TimelineEntry {
    let date: Date
    let suspect: WantedSuspect?
    let image: UIImage?
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
            var suspects = await fetchSuspects()
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

            let now = Date()
            var entries: [WantedEntry] = []
            let rotationCount = min(suspects.count, 5)

            if rotationCount == 0 {
                entries.append(WantedEntry(date: now, suspect: nil, image: nil))
            } else {
                for index in 0..<rotationCount {
                    let suspect = suspects[index]
                    let entryDate = Calendar.current.date(byAdding: .minute, value: index * 15, to: now) ?? now
                    let image = await loadImage(urlString: suspect.photoUrl)
                    entries.append(WantedEntry(date: entryDate, suspect: suspect, image: image))
                }
            }

            let refreshDate = Calendar.current.date(byAdding: .hour, value: 1, to: now) ?? now
            completion(Timeline(entries: entries, policy: .after(refreshDate)))
        }
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
                    Text(suspect.suspectName ?? "不明")
                        .font(.headline)
                        .foregroundColor(.white)
                        .lineLimit(1)
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
            VStack {
                Text("指名手配ウォッチ")
                    .font(.caption)
                    .foregroundColor(.white)
                Text("データを取得できませんでした")
                    .font(.caption2)
                    .foregroundColor(muted)
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
