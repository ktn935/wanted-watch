// plugins/withLiveActivityPod.js
// expo-modules-autolinkingがローカルのfile:依存モジュール(modules/live-activity)を
// なぜかPodfileに反映しない問題(既知のExpo側の不具合と思われる。
// https://github.com/expo/expo/issues/41044 の症状と一致)への回避策。
// autolinkingでの自動検出に頼らず、Podfileのメインアプリターゲットに直接
// LiveActivityControllerのpodを追記する。

const { withPodfile } = require('@expo/config-plugins');

const POD_LINE = "  pod 'LiveActivityController', :path => '../modules/live-activity/ios'\n";

module.exports = function withLiveActivityPod(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('LiveActivityController')) {
      return config;
    }
    const updated = contents.replace(/use_expo_modules!/, `use_expo_modules!\n${POD_LINE}`);
    if (updated === contents) {
      throw new Error(
        'withLiveActivityPod: could not find `use_expo_modules!` in the generated Podfile to anchor the LiveActivityController pod insertion.'
      );
    }
    config.modResults.contents = updated;
    return config;
  });
};
