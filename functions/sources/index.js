// sources/index.js
// 参照する都道府県警察サイトのsourceを登録する場所。
// 新しいサイトを追加するときは、このディレクトリに新しいファイルを1つ作り
// (id, name, fetchList, fetchDetail を持つ既存のsourceを参考に)、
// ここに追加するだけでよい。既存のsourceやscrapeAll.jsは変更不要。

const keishicho = require('./keishicho');
const npa = require('./npa');
const osaka = require('./osaka');

module.exports = [keishicho, npa, osaka];
