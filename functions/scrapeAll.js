// scrapeAll.js
// sources/ に登録された都道府県警察サイトを順番にスクレイピングし、
// 結果をまとめて返す共通処理。サイトごとの違いは sources/*.js 側に閉じ込め、
// ここではどのサイトかを意識しない。

const sources = require('./sources');

async function scrapeAll() {
  const allItems = [];

  for (const source of sources) {
    let list;
    try {
      list = await source.fetchList();
    } catch (e) {
      console.error(`[${source.name}] 一覧ページの取得に失敗しました`, e.message);
      continue;
    }

    for (const item of list) {
      try {
        const detail = await source.fetchDetail(item.detailUrl);
        allItems.push({ ...item, ...detail, sourceId: source.id, sourceName: source.name });
      } catch (e) {
        console.error(`[${source.name}] 詳細ページの取得に失敗しました: ${item.detailUrl}`, e.message);
      }
      // 相手サーバーへの負荷を抑えるため、リクエスト間隔を空ける
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return allItems;
}

module.exports = { scrapeAll };

// `node scrapeAll.js` で単体実行して結果を確認できる
if (require.main === module) {
  scrapeAll()
    .then((data) => {
      console.log(JSON.stringify(data, null, 2));
      console.log(`\n取得件数: ${data.length}件`);
    })
    .catch((e) => {
      console.error('スクレイピングに失敗しました', e);
      process.exit(1);
    });
}
