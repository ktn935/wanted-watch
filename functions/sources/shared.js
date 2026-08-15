// sources/shared.js
// 各都道府県サイト共通で使うもの。

const REQUEST_HEADERS = {
  // 個人開発アプリであることが分かるUser-Agentにしておく(相手サーバーへの配慮)。
  // 一部の県警サイトはWAFが「ブラウザらしくない」User-Agent(括弧内に長い説明文が
  // 入るなど)を弾くため、ブラウザのUAに近い形式に寄せつつアプリ名を含めている。
  'User-Agent': 'Mozilla/5.0 (compatible; WantedWatchApp/1.0)',
};

module.exports = { REQUEST_HEADERS };
