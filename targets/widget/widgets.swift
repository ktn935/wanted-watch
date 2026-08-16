import WidgetKit
import SwiftUI

// お気に入り専用ウィジェット。
// メインアプリ(lib/FavoritesContext.tsx)がお気に入り登録時にApp Group経由で
// 書き込んだデータをそのまま表示するだけで、ウィジェット内では現在地取得や
// Firestoreへの直接アクセスは一切行わない。
// (以前は現在地取得+Firestore直接取得を行っていたが、ウィジェット内での
//  CLLocationManager呼び出しが応答を返さず、ウィジェットが「読み込み中」の
//  まま固まる問題があったため、信頼性を優先してこの構成にした。)

private let appGroupId = "group.com.ktn935.wantedwatch"

struct FavoriteSuspect: Codable {
    let id: String
    let suspectName: String?
    let title: String?
    let stationName: String?
    let photoUrl: String?
    let sourceUrl: String
}

private func loadFavorites() -> [FavoriteSuspect] {
    guard let json = UserDefaults(suiteName: appGroupId)?.string(forKey: "favorites"),
          let data = json.data(using: .utf8),
          let favorites = try? JSONDecoder().decode([FavoriteSuspect].self, from: data) else {
        return []
    }
    return favorites
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
    let suspect: FavoriteSuspect?
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
            let favorites = loadFavorites()
            let now = Date()
            var entries: [WantedEntry] = []

            if favorites.isEmpty {
                entries.append(WantedEntry(date: now, suspect: nil, image: nil))
            } else {
                // 複数登録されている場合は15分おきに切り替わるようにする
                for (index, suspect) in favorites.prefix(5).enumerated() {
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
                        .overlay(Image(systemName: "star.fill").foregroundColor(accent))
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
                Text("お気に入りに登録した指名手配情報がここに表示されます")
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
        .description("お気に入り登録した指名手配情報を表示します。")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemMedium) {
    widget()
} timeline: {
    WantedEntry(date: .now, suspect: nil, image: nil)
}
