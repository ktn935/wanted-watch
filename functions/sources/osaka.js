// sources/osaka.js
// 大阪府警察「WANTED」ページから被疑者情報を取得するsource。
//
// 出典: 大阪府警察ホームページ (https://www.police.pref.osaka.lg.jp/)
//
// 【メモ】警視庁より構造が素直で、詳細ページに<table>形式の
// 「被疑者情報」(氏名・生年月日・身長・身体特徴・手配署)がまとまっている。
// 発生場所は表に無い場合もあり、その際はnullになる。

const axios = require('axios');
const cheerio = require('cheerio');
const { REQUEST_HEADERS } = require('./shared');

const BASE_URL = 'https://www.police.pref.osaka.lg.jp';
const LIST_URL = `${BASE_URL}/jiken/wanted/index.html`;

async function fetchList() {
  const { data: html } = await axios.get(LIST_URL, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  const items = [];
  $('div.image').each((_, div) => {
    const $div = $(div);
    const $a = $div.find('p a[href*="/jiken/wanted/"]');
    if ($a.length === 0) return;

    const href = $a.attr('href');
    const img = $div.find('img').attr('src');

    items.push({
      detailUrl: new URL(href, BASE_URL).toString(),
      thumbnailUrl: img ? new URL(img, BASE_URL).toString() : null,
      listText: $a.text().trim(),
    });
  });

  // 1つの詳細ページに複数の被疑者が載っているケースがあるため重複除去
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.detailUrl)) return false;
    seen.add(item.detailUrl);
    return true;
  });
}

async function fetchDetail(detailUrl) {
  const { data: html } = await axios.get(detailUrl, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  // 見出しは「妻に対する殺人事件被疑者（越智 清（オチ キヨシ））」のように
  // 事件名の後ろに「被疑者（氏名）」が続く形式。事件名だけを取り出す
  // (氏名は suspectName で別途表示するため、ここでは重複させない)。
  const titleRaw = $('h1').first().text().trim();
  const title = titleRaw.split(/[（(]/)[0].replace(/被疑者\s*$/, '').trim() || null;

  // 「被疑者情報」テーブルの行から値を取り出すヘルパー
  const tableValue = (label) => {
    let value = '';
    $('table tr').each((_, tr) => {
      const $tr = $(tr);
      if ($tr.find('th').text().trim() === label) {
        value = $tr.find('td').text().replace(/\s+/g, ' ').trim();
      }
    });
    return value;
  };

  // 氏名セルは「鷹巣 浩之（タカス ヒロユキ）<br>（注意）当サイトでは...」のように、
  // 同じセル内に注意書きが2行目として入っていることがあるため、1行目だけを取り出す。
  const tableFirstLine = (label) => {
    let value = '';
    $('table tr').each((_, tr) => {
      const $tr = $(tr);
      if ($tr.find('th').text().trim() === label) {
        const cellHtml = $tr.find('td').html() || '';
        const firstLineHtml = cellHtml.split(/<br\s*\/?>/i)[0];
        value = cheerio.load(`<div>${firstLineHtml}</div>`)('div').text().replace(/\s+/g, ' ').trim();
      }
    });
    return value;
  };

  // 見出し直後の本文(次のh2まで)を取得するヘルパー。「連絡先」から電話番号を拾うのに使う。
  const sectionText = (headingKeyword) => {
    let text = '';
    $('h2').each((_, h) => {
      if ($(h).text().trim() === headingKeyword) {
        text = $(h).nextUntil('h2').text().replace(/\s+/g, ' ').trim();
      }
    });
    return text;
  };

  // 表の「氏名」は「越智 清（オチ キヨシ）」のようにふりがな付きなので、氏名部分だけ取り出す
  const nameRaw = tableFirstLine('氏名');
  const suspectName = nameRaw.replace(/[（(][^）)]*[）)]\s*$/, '').trim() || null;

  const occurrencePlace = tableValue('発生場所') || tableValue('発生現場') || null;
  // ページによって「手配署」「手配所属」と表記ゆれがある
  const stationName = tableValue('手配署') || tableValue('手配所属') || null;

  // 発見の手がかりになる身体的特徴(身長・身体特徴)をまとめる
  const height = tableValue('身長');
  const bodyFeature = tableValue('身体特徴');
  const characteristicsParts = [
    height ? `身長${height}` : '',
    bodyFeature && bodyFeature !== 'なし' ? bodyFeature : '',
  ].filter(Boolean);
  const characteristics = characteristicsParts.join('、') || null;

  const contactBlock = sectionText('連絡先');
  const phoneMatch = contactBlock.match(/(0\d{1,4}-\d{1,4}-\d{3,4})/);
  const phone = phoneMatch ? phoneMatch[1] : null;

  // 顔写真のalt属性は「被疑者の顔写真」「○○の写真」「○○の顔写真」など表記が揺れるため、
  // 本文エリア内で alt に「写真」を含む画像を優先し、無ければ「似顔絵」を含む画像を使う。
  // (ヘッダーロゴ等の無関係な画像を拾わないよう、本文エリア内に絞って探す)
  const $content = $('article, #contents, #contents-in').first();
  const $images = ($content.length ? $content : $('body')).find('img');
  const photoUrl =
    $images
      .filter((_, img) => ($(img).attr('alt') || '').includes('写真'))
      .first()
      .attr('src') ||
    $images
      .filter((_, img) => ($(img).attr('alt') || '').includes('似顔絵'))
      .first()
      .attr('src') ||
    null;

  return {
    title,
    suspectName,
    occurrencePlace,
    stationName,
    phone,
    characteristics,
    photoUrl: photoUrl ? new URL(photoUrl, BASE_URL).toString() : null,
    sourceUrl: detailUrl,
    // 政府標準利用規約に基づく出典表記。画面に必ず一緒に表示すること。
    sourceLabel: `出典:大阪府警察ホームページ(${detailUrl})`,
  };
}

module.exports = {
  id: 'osaka',
  name: '大阪府警察',
  fetchList,
  fetchDetail,
};
