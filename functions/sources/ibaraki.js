// sources/ibaraki.js
// 茨城県警察「県内公開捜査対象指名手配被疑者」ページから被疑者情報を取得するsource。
// 一覧ページには各事件への個別リンクがあり(警視庁と同様の一覧+詳細の2段構成)、
// 詳細ページは <h3>発生日時・場所</h3><ul><li><strong>ラベル</strong>：値</li></ul>
// という形式で構造化されている。
//
// 出典: 茨城県警察ホームページ (https://www.pref.ibaraki.jp/)

const axios = require('axios');
const cheerio = require('cheerio');
const { REQUEST_HEADERS } = require('./shared');

const BASE_URL = 'https://www.pref.ibaraki.jp';
const LIST_URL = `${BASE_URL}/kenkei/a04_jiken/index.html`;

async function fetchList() {
  const { data: html } = await axios.get(LIST_URL, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  const items = [];
  $('h2').each((_, h2) => {
    if ($(h2).text().trim() !== '県内公開捜査対象指名手配被疑者') return;
    $(h2)
      .nextUntil('h2', 'ul')
      .find('a')
      .each((_, a) => {
        const href = $(a).attr('href');
        if (!href) return;
        items.push({
          detailUrl: new URL(href, LIST_URL).toString(),
          thumbnailUrl: null,
          listText: $(a).text().trim(),
        });
      });
  });

  return items;
}

// 見出し(h2/h3)直後の<ul>から、「ラベル：値」形式のli要素を取り出すヘルパー
function sectionFields($, headingText) {
  let fields = {};
  $('h2, h3').each((_, h) => {
    if ($(h).text().trim() !== headingText) return;
    const $ul = $(h).nextUntil('h2, h3', 'ul').first().length
      ? $(h).nextUntil('h2, h3', 'ul').first()
      : $(h).next('ul');
    $ul.find('li').each((_, li) => {
      const text = $(li).text().trim();
      const m = text.match(/^([^：:]+)[：:](.*)$/);
      if (m) fields[m[1].trim()] = m[2].trim();
    });
  });
  return fields;
}

async function fetchDetail(detailUrl) {
  const { data: html } = await axios.get(detailUrl, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();

  const placeFields = sectionFields($, '発生日時・場所');
  const suspectFields = sectionFields($, '被疑者');

  // 「永山　誠（ながやま　まこと）57歳、男性」のような文字列から氏名部分だけ取り出す
  const nameRaw = suspectFields['氏名'] || '';
  const nameMatch = nameRaw.match(/^([^（(]+)/);
  const suspectName = nameMatch ? nameMatch[1].trim() : nameRaw || null;

  const characteristics =
    [suspectFields['身長'], suspectFields['体格']].filter(Boolean).join('、') || null;

  const photoUrl = $('h3')
    .filter((_, h3) => $(h3).text().trim() === '被疑者の画像')
    .nextUntil('h2, h3')
    .find('img')
    .first()
    .attr('src');

  return {
    title,
    suspectName,
    occurrencePlace: placeFields['発生場所'] || null,
    stationName: null,
    phone: null,
    characteristics,
    photoUrl: photoUrl ? new URL(photoUrl, detailUrl).toString() : null,
    sourceUrl: detailUrl,
    // 政府標準利用規約に基づく出典表記。画面に必ず一緒に表示すること。
    sourceLabel: `出典:茨城県警察ホームページ(${detailUrl})`,
  };
}

module.exports = {
  id: 'ibaraki',
  name: '茨城県警察',
  fetchList,
  fetchDetail,
};
