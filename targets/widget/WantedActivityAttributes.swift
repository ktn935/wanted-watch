// WantedActivityAttributes.swift
// Live Activityの型定義。ActivityKitの制約上、Xcodeターゲット間でコードを共有できないため、
// 同じ内容のファイルを targets/widget/WantedActivityAttributes.swift にも複製している。
// フィールドを変更する場合は両方を必ず同じ内容に保つこと。

import ActivityKit

public struct WantedActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var suspectName: String
        public var title: String
        public var stationName: String?
        public var photoUrl: String?
    }

    public init() {}
}
