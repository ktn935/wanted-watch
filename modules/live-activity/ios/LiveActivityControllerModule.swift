import ExpoModulesCore
import ActivityKit

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
                  let state = try? JSONDecoder().decode(
                    WantedActivityAttributes.ContentState.self,
                    from: data
                  ) else {
                return false
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
}
