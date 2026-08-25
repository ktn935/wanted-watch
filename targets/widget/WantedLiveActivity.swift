import ActivityKit
import WidgetKit
import SwiftUI

// ロック画面・Dynamic Islandに指名手配情報を表示するLive Activity。
// 開始/更新/終了はmodules/live-activity(ネイティブモジュール)経由でJS側から行う。
// ホーム画面ウィジェット(widgets.swift)と違い、こちらはFirestoreやApp Groupを
// 自分で読みに行かず、渡されたcontext.stateをそのまま表示するだけ。

private let accent = Color(red: 1.0, green: 0.549, blue: 0.0) // #ff8c00
private let muted = Color(white: 0.65)

@available(iOS 16.2, *)
struct WantedLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WantedActivityAttributes.self) { context in
            HStack(alignment: .center, spacing: 10) {
                photoView(urlString: context.state.photoUrl, size: 56, corner: 8)

                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.suspectName)
                        .font(.headline)
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text(context.state.title)
                        .font(.caption)
                        .foregroundColor(accent)
                        .lineLimit(1)
                    if let stationName = context.state.stationName {
                        Text("管轄: \(stationName)")
                            .font(.caption2)
                            .foregroundColor(muted)
                            .lineLimit(1)
                    }
                }
                Spacer()
            }
            .padding(14)
            .activityBackgroundTint(Color.black)
            .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    photoView(urlString: context.state.photoUrl, size: 44, corner: 22)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Image(systemName: "star.fill")
                        .foregroundColor(accent)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.state.suspectName)
                            .font(.headline)
                            .foregroundColor(.white)
                        Text(context.state.title)
                            .font(.caption)
                            .foregroundColor(muted)
                    }
                }
            } compactLeading: {
                photoView(urlString: context.state.photoUrl, size: 20, corner: 10)
            } compactTrailing: {
                Text(context.state.suspectName.prefix(3))
                    .font(.caption2)
                    .foregroundColor(.white)
            } minimal: {
                Image(systemName: "person.fill")
                    .foregroundColor(accent)
            }
        }
    }

    // Live Activityはビューのレンダリング時にネットワークアクセスができないため、
    // photoUrlにはリモートURLではなく、メインアプリが事前にApp Group共有コンテナへ
    // 保存したローカルファイルのパスが入っている(LiveActivityControllerModule.swift参照)。
    @ViewBuilder
    private func photoView(urlString: String?, size: CGFloat, corner: CGFloat) -> some View {
        if let path = urlString, let uiImage = UIImage(contentsOfFile: path) {
            Image(uiImage: uiImage)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: size, height: size)
                .clipShape(RoundedRectangle(cornerRadius: corner))
        } else {
            RoundedRectangle(cornerRadius: corner)
                .fill(Color(white: 0.15))
                .frame(width: size, height: size)
                .overlay(Image(systemName: "person.fill").foregroundColor(muted))
        }
    }
}
