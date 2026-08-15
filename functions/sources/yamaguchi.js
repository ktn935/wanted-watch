// sources/yamaguchi.js
// 山口県警察「指名手配」ページから被疑者情報を取得するsource。
// 1ページに複数の事件が
//   <h3>山口県公開指名手配N</h3><img alt="○○顔写真">
//   <table><caption>事件名</caption><tbody>
//     <tr><th>被疑者</th><td>氏名(ふりがな)<br>生年月日<br>身長・特徴</td></tr>
//     <tr><th>発生日</th>...<tr><th>発生場所</th>...<tr><th>事件概要</th>...
//   </tbody></table>
//   <p>○○警察署　電話083-xxx-0110</p>
// という形でまとまっており、個別の詳細ページが無い。npa.js等と同じくfetchList()の
// 時点で全項目を解析してキャッシュし、fetchDetail()はキャッシュを返すだけ。
//
// 出典: 山口県警察ホームページ (https://www.pref.yamaguchi.lg.jp/)

const axios = require('axios');
const cheerio = require('cheerio');
const { REQUEST_HEADERS } = require('./shared');

const BASE_URL = 'https://www.pref.yamaguchi.lg.jp';
const LIST_URL = `${BASE_URL}/site/police/10074.html`;

const detailCache = new Map();

// 全角ダッシュ「－」を半角ハイフンに変換する
function normalizeDash(str) {
  return str.replace(/[－ー]/g, '-');
}

async function fetchList() {
  const { data: html } = await axios.get(LIST_URL, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  const items = [];

  $('h3').each((i, h3) => {
    const $h3 = $(h3);
    const heading = $h3.text().trim();
    if (!/^山口県公開指名手配\d+$/.test(heading)) return;

    const $scope = $h3.nextUntil('h3');
    const $table = $scope.filter('table').first();
    if ($table.length === 0) return;

    const title = $table.find('caption').first().text().trim();

    const fields = {};
    const fieldsHtml = {};
    $table.find('tr').each((_, tr) => {
      const $tr = $(tr);
      const label = $tr.find('th').text().trim();
      if (!label) return;
      fields[label] = $tr.find('td').text().replace(/\s+/g, ' ').trim();
      fieldsHtml[label] = $tr.find('td').html() || '';
    });

    // 「村田　俊治(ムラタ　シュンジ)<br>昭和10年9月15日生<br>身長：165cm　痩せ型、短髪」
    // のように氏名・生年月日・身体特徴が1つのセルに改行区切りで入っている
    const suspectLines = (fieldsHtml['被疑者'] || '')
      .split(/<br\s*\/?>/i)
      .map((s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const nameRaw = suspectLines[0] || '';
    const nameMatch = nameRaw.match(/^([^（(]+)/);
    const suspectName = nameMatch ? nameMatch[1].trim() : nameRaw || null;
    const characteristics = suspectLines.slice(1).join('、') || null;

    // 表の後ろの<p>に「山口警察署刑事第一課　電話083－924－0110」のような
    // 連絡先が書かれている
    const contactText = normalizeDash($scope.filter('p').text());
    const phoneMatch = contactText.match(/(0\d{1,4}-\d{1,4}-\d{3,4})/);
    const phone = phoneMatch ? phoneMatch[1] : null;
    const stationMatch = contactText.match(/([一-龥ぁ-んー]+警察署[^\s　0-9]*)/);
    const stationName = stationMatch ? stationMatch[1] : null;

    const imgSrc = $scope.find('img[alt*="顔写真"]').first().attr('src');
    const photoUrl = imgSrc ? new URL(imgSrc, LIST_URL).toString() : null;

    const detailUrl = `${LIST_URL}#section-${i}`;

    const detail = {
      title,
      suspectName,
      occurrencePlace: fields['発生場所'] || null,
      stationName,
      phone,
      characteristics,
      photoUrl,
      sourceUrl: detailUrl,
      // 政府標準利用規約に基づく出典表記。画面に必ず一緒に表示すること。
      sourceLabel: `出典:山口県警察ホームページ(${LIST_URL})`,
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
  id: 'yamaguchi',
  name: '山口県警察',
  fetchList,
  fetchDetail,
};
