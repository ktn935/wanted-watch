// sources/shared.js
// 各都道府県サイト共通で使うもの。

const REQUEST_HEADERS = {
  // 個人開発アプリであることが分かるUser-Agentにしておく(相手サーバーへの配慮)
  'User-Agent': 'WantedWatchApp/1.0 (individual dev app; source attribution used)',
};

module.exports = { REQUEST_HEADERS };
