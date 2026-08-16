import WidgetKit
import SwiftUI

@main
struct exportWidgets: WidgetBundle {
    var body: some Widget {
        widget()
        if #available(iOS 16.2, *) {
            WantedLiveActivity()
        }
    }
}
