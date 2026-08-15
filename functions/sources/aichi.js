// sources/aichi.js
// 愛知県警察「指名手配」ページから被疑者情報を取得するsource。
// 一覧ページ(sousa/kouhou/index.html)の「指名手配」見出し直後にある個別事件への
// リンクを辿り、詳細ページを<table class="datatable">から解析する。
//
// 出典: 愛知県警察ホームページ (https://www.pref.aichi.jp/)

const axios = require('axios');
const cheerio = require('cheerio');
const { REQUEST_HEADERS } = require('./shared');

const BASE_URL = 'https://www.pref.aichi.jp';
const LIST_URL = `${BASE_URL}/police/anzen/sousa/kouhou/index.html`;

// 全角数字・全角括弧・全角ダッシュを半角に変換する(電話番号の表記が
// 「（０５２）８２２ー０１１０」のように全角のことがあるため)
function toHalfWidth(str) {
  return str
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[ー－]/g, '-')
    .replace(/（/g, '(')
    .replace(/）/g, ')');
}

async function fetchList() {
  const { data: html } = await axios.get(LIST_URL, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  const items = [];
  $('h3').each((_, h3) => {
    const text = $(h3).text().trim();
    if (text !== '指名手配') return;
    $(h3)
      .nextUntil('h3')
      .filter('p')
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

async function fetchDetail(detailUrl) {
  const { data: html } = await axios.get(detailUrl, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  // h1は「林 紹葳（リン ショウイ）」のような形式。複数あるページ共通h1と
  // 区別するため、最後(=本文側)のh1を使う
  const nameRaw = $('h1').last().text().trim();
  const nameMatch = nameRaw.match(/^([^（(]+)/);
  const suspectName = nameMatch ? nameMatch[1].trim() : nameRaw || null;

  const fields = {};
  $('table.datatable th').each((_, th) => {
    const $th = $(th);
    const label = $th.text().trim();
    const value = $th.next('td').text().replace(/\s+/g, ' ').trim();
    if (label) fields[label] = value;
  });

  const photoUrl = $('img[alt*="顔画像"]').first().attr('src');

  // 「平成11年10月1日夕方、名古屋市南区のパチンコ店で...」から市区町村名を抽出
  const gaiyou = $('h2')
    .filter((_, h2) => $(h2).text().trim() === '事件概要')
    .next('p')
    .text();
  const placeMatch = gaiyou.match(/([一-龥]{2,10}[市区町村])/);
  const occurrencePlace = placeMatch ? placeMatch[1] : null;

  const contactText = toHalfWidth(
    $('h2')
      .filter((_, h2) => $(h2).text().trim() === '情報提供先')
      .next('p')
      .text()
  );
  const phoneMatch = contactText.match(/電話\s*\((\d{2,4})\)(\d{2,4})-(\d{3,4})/);
  const phone = phoneMatch ? `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}` : null;

  return {
    title: fields['罪名'] || null,
    suspectName,
    occurrencePlace,
    stationName: fields['手配署'] || null,
    phone,
    characteristics: fields['特徴'] || null,
    photoUrl: photoUrl ? new URL(photoUrl, detailUrl).toString() : null,
    sourceUrl: detailUrl,
    // 政府標準利用規約に基づく出典表記。画面に必ず一緒に表示すること。
    sourceLabel: `出典:愛知県警察ホームページ(${detailUrl})`,
  };
}

module.exports = {
  id: 'aichi',
  name: '愛知県警察',
  fetchList,
  fetchDetail,
};
