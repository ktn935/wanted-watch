import ExpoModulesCore
import ActivityKit

// Live Activityはビューのレンダリング時にネットワークアクセスができない
// (AsyncImageでリモートURLを渡しても読み込めない)ため、開始/更新のタイミングで
// メインアプリ側が先に画像をダウンロードし、App Groupの共有コンテナに保存してから
// ローカルファイルパスをcontent stateに詰め直す。
private let appGroupId = "group.com.ktn935.wantedwatch"
private let activityPhotoFileName = "live_activity_photo.jpg"

public class LiveActivityControllerModule: Module {
    // Activity<WantedActivityAttributes> はiOS 16.1以降でしか使えない型のため、
    // プロパティの型としてクラス全体を@availableにせずに済むよう Any? で保持する。
    private var currentActivity: Any?

    public func definition() -> ModuleDefinition {
        Name("LiveActivityController")

        AsyncFunction("startOrUpdateActivity") { (stateJson: String) -> Bool in
            guard #available(iOS 16.2, *) else { return false }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }

            guard let data = stateJson.data(using: .utf8),
                  var state = try? JSONDecoder().decode(
                    WantedActivityAttributes.ContentState.self,
                    from: data
                  ) else {
                return false
            }

            if let remoteUrlString = state.photoUrl, let remoteUrl = URL(string: remoteUrlString) {
                state.photoUrl = await Self.downloadPhotoToSharedContainer(from: remoteUrl)
            }

            let content = ActivityContent(state: state, staleDate: nil)

            if let existing = self.currentActivity as? Activity<WantedActivityAttributes> {
                await existing.update(content)
                return true
            }

            do {
                let activity = try Activity<WantedActivityAttributes>.request(
                    attributes: WantedActivityAttributes(),
                    content: content,
                    pushType: nil
                )
                self.currentActivity = activity
                return true
            } catch {
                return false
            }
        }

        AsyncFunction("endActivity") {
            guard #available(iOS 16.2, *) else { return }
            guard let activity = self.currentActivity as? Activity<WantedActivityAttributes> else {
                return
            }
            await activity.end(nil, dismissalPolicy: .immediate)
            self.currentActivity = nil
        }

        Function("isActivityRunning") { () -> Bool in
            guard #available(iOS 16.2, *) else { return false }
            return self.currentActivity as? Activity<WantedActivityAttributes> != nil
        }
    }

    /// リモートの写真URLをダウンロードし、App Group共有コンテナに保存する。
    /// 保存したファイルの絶対パスを返す(失敗時はnil)。
    private static func downloadPhotoToSharedContainer(from url: URL) async -> String? {
        guard let containerUrl = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else {
            return nil
        }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let fileUrl = containerUrl.appendingPathComponent(activityPhotoFileName)
            try data.write(to: fileUrl, options: .atomic)
            return fileUrl.path
        } catch {
            return nil
        }
    }
}
