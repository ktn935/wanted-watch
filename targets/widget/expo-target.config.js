/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "widget",
  icon: "../../assets/images/icon.png",
  colors: {
    $accent: "#ff8c00",
    $widgetBackground: "#000000",
  },
  entitlements: {},
});