// sources/chiba.js
// 千葉県警察「指名手配被疑者」ページから被疑者情報を取得するsource。
// 1ページに複数の事件が <section><h4>事件名</h4><img>写真<table>詳細</table></section>
// という形でまとまっており、個別の詳細ページが無い。npa.js/kanagawa.jsと同じく
// fetchList() の時点で全項目を解析してキャッシュし、fetchDetail() はキャッシュを返すだけ。
//
// 出典: 千葉県警察ホームページ (https://www.police.pref.chiba.jp/)

const axios = require('axios');
const cheerio = require('cheerio');
const { REQUEST_HEADERS } = require('./shared');

const BASE_URL = 'https://www.police.pref.chiba.jp';
const LIST_URL = `${BASE_URL}/keisoka/safe-life_coop-suspect.html`;

const detailCache = new Map();

async function fetchList() {
  const { data: html } = await axios.get(LIST_URL, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  const items = [];

  $('h4.h4Style').each((_, h4) => {
    const $h4 = $(h4);
    const title = $h4.text().trim();
    // 「警察庁ホームページへのリンク」のような、事件ではないセクションを除外
    const $section = $h4.closest('section');
    const $table = ($section.length ? $section : $h4.parent()).find('table.borderTable').first();
    if ($table.length === 0) return;

    const fields = {};
    const fieldsHtml = {};
    $table.find('tr').each((_, tr) => {
      const $tr = $(tr);
      const label = $tr.find('th').text().trim();
      if (!label) return;
      fields[label] = $tr.find('td').text().replace(/\s+/g, ' ').trim();
      fieldsHtml[label] = $tr.find('td').html() || '';
    });

    // 「陳 万哲（チン マンツォル）<br>異名 ロウシン」のように、氏名セルの2行目に
    // 異名が入っていることがあるため、<br>で区切って1行目だけを氏名として使う
    const nameFirstLine = (fieldsHtml['氏名'] || '')
      .split(/<br\s*\/?>/i)[0]
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const nameMatch = nameFirstLine.match(/^([^（(]+)/);
    const suspectName = nameMatch ? nameMatch[1].trim() : nameFirstLine || null;

    const contact = fields['連絡先'] || '';
    const phoneMatch = contact.match(/(0\d{1,4}-\d{1,4}-\d{3,4})/);
    const phone = phoneMatch ? phoneMatch[1] : null;
    const stationName =
      contact
        .replace(/緊急時110番または/, '')
        .replace(/[:：].*$/, '')
        .trim() || null;

    const characteristics = fields['身体特徴'] || null;

    const imgSrc = ($section.length ? $section : $h4.parent())
      .find('img[alt*="顔写真"]')
      .first()
      .attr('src');
    const photoUrl = imgSrc ? new URL(imgSrc, BASE_URL).toString() : null;

    const anchorId = $h4.attr('id');
    const detailUrl = `${LIST_URL}#${anchorId || encodeURIComponent(title)}`;

    const detail = {
      title,
      suspectName,
      occurrencePlace: null,
      stationName,
      phone,
      characteristics,
      photoUrl,
      sourceUrl: detailUrl,
      // 政府標準利用規約に基づく出典表記。画面に必ず一緒に表示すること。
      sourceLabel: `出典:千葉県警察ホームページ(${LIST_URL})`,
    };
    detailCache.set(detailUrl, detail);

    items.push({
      detailUrl,
      thumbnailUrl: photoUrl,
      listText: title,
    });
  });

  return items;
}

async function fetchDetail(detailUrl) {
  const cached = detailCache.get(detailUrl);
  if (!cached) {
    throw new Error(`fetchList()のキャッシュに見つかりません: ${detailUrl}`);
  }
  return cached;
}

module.exports = {
  id: 'chiba',
  name: '千葉県警察',
  fetchList,
  fetchDetail,
};
