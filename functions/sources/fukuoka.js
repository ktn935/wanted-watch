// sources/fukuoka.js
// 福岡県警察「指名手配」ページから被疑者情報を取得するsource。
// 一覧ページには個別事件へのリンクがあり(見出しに「（氏名）」が含まれる)、
// 詳細ページはポスター画像+PDF+「○○警察署 電話xxx」という簡素な構成。
//
// 出典: 福岡県警察ホームページ (https://www.police.pref.fukuoka.jp/)

const axios = require('axios');
const cheerio = require('cheerio');
const { REQUEST_HEADERS } = require('./shared');

const BASE_URL = 'https://www.police.pref.fukuoka.jp';
const LIST_URL = `${BASE_URL}/jiken-jiko/01.html`;

async function fetchList() {
  const { data: html } = await axios.get(LIST_URL, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  const items = [];
  $('h2').each((_, h2) => {
    if ($(h2).text().trim() !== '指名手配') return;
    $(h2)
      .nextUntil('h2', 'div')
      .find('a')
      .each((_, a) => {
        const href = $(a).attr('href');
        const text = $(a).text().trim();
        // 「氏名」を含まないリンク(警察庁ページへのリンク等)は除外
        if (!href || !/（.+）/.test(text)) return;
        items.push({
          detailUrl: new URL(href, LIST_URL).toString(),
          thumbnailUrl: null,
          listText: text,
        });
      });
  });

  return items;
}

async function fetchDetail(detailUrl) {
  const { data: html } = await axios.get(detailUrl, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  // 「殺人被疑者の検挙にご協力を！（赵立新）」のような見出しから
  // 罪種(title)と氏名(suspectName)を取り出す
  const heading = $('h1').first().text().trim();
  const nameMatch = heading.match(/[（(]([^）)]+)[）)]/);
  const suspectName = nameMatch ? nameMatch[1].trim() : null;
  const titleMatch = heading.match(/^(.+?)被疑者/);
  const title = titleMatch ? titleMatch[1].trim() : heading || null;

  const photoUrl = $('h1').first().parent().find('img').first().attr('src');

  // 「福岡県中央警察署<br />➡　電話　092-734-0110」のような文字列から抽出
  const contactText = $('h1').first().parent().find('div').last().text();
  const phoneMatch = contactText.match(/(0\d{1,4}-\d{1,4}-\d{3,4})/);
  const phone = phoneMatch ? phoneMatch[1] : null;
  const stationMatch = contactText.match(/([一-龥ぁ-んー]+警察署)/);
  const stationName = stationMatch ? stationMatch[1] : null;

  return {
    title,
    suspectName,
    occurrencePlace: null,
    stationName,
    phone,
    characteristics: null,
    photoUrl: photoUrl ? new URL(photoUrl, detailUrl).toString() : null,
    sourceUrl: detailUrl,
    // 政府標準利用規約に基づく出典表記。画面に必ず一緒に表示すること。
    sourceLabel: `出典:福岡県警察ホームページ(${detailUrl})`,
  };
}

module.exports = {
  id: 'fukuoka',
  name: '福岡県警察',
  fetchList,
  fetchDetail,
};
