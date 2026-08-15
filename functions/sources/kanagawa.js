// sources/kanagawa.js
// 神奈川県警察「指名手配」ページから被疑者情報を取得するsource。
// このページは1ページに全員分の情報がまとまっており(氏名・年齢・国籍・身長・
// 身体特徴・罪名・事件概要・情報受付をラベル付きの<li>で列挙)、個別の詳細ページが無い。
// そのため fetchList() の時点で全項目を解析してキャッシュし、fetchDetail() は
// キャッシュから返すだけにする(npa.jsと同じ方式)。
//
// 出典: 神奈川県警察ホームページ (https://www.police.pref.kanagawa.jp/)
//
// ページ内には「神奈川県警察 指名手配」セクションの他に「警察庁指定重要指名手配」
// セクション(npa.jsと重複する全国版)もあるため、前者だけを対象にする。

const axios = require('axios');
const cheerio = require('cheerio');
const { REQUEST_HEADERS } = require('./shared');

const BASE_URL = 'https://www.police.pref.kanagawa.jp';
const LIST_URL = `${BASE_URL}/sodan/jiko_tehai/wanted.html`;
const SECTION_HEADING = '神奈川県警察 指名手配';

const detailCache = new Map();

async function fetchList() {
  const { data: html } = await axios.get(LIST_URL, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  const items = [];

  $('h2').each((_, h) => {
    if ($(h).text().trim() !== SECTION_HEADING) return;

    const $lists = $(h).nextUntil('h2', 'ul.list_00');
    $lists.each((i, ul) => {
      const $ul = $(ul);
      const fields = {};
      $ul.find('li').each((_, li) => {
        const $li = $(li);
        const label = $li.find('span.bold').first().text().trim();
        if (!label) return;
        const value = $li.text().replace(label, '').trim();
        fields[label] = value;
      });

      const nameRaw = fields['氏名'] || '';
      const nameMatch = nameRaw.match(/^([^（(]+)/);
      const suspectName = nameMatch ? nameMatch[1].trim() : nameRaw || null;

      const imgSrc = $ul.prev('p').find('img').attr('src');
      const photoUrl = imgSrc ? new URL(imgSrc, LIST_URL).toString() : null;

      // 「都筑警察署　045‐949‐0110」のような文字列から警察署名と電話番号を分離
      const contact = fields['情報受付'] || '';
      const phoneMatch = contact.match(/(\d{2,4}[‐-]\d{2,4}[‐-]\d{3,4})/);
      const phone = phoneMatch ? phoneMatch[1].replace(/‐/g, '-') : null;
      const stationName = contact.replace(/[\d‐-]+$/, '').trim() || null;

      // 「平成17年1月21日、横浜市中区において、女性を殺害した。」のような文から
      // 市区町村名だけを取り出す(取れないこともある)
      const gaiyou = fields['事件概要'] || '';
      const placeMatch = gaiyou.match(/([一-龥]{2,10}[市区町村])/);
      const occurrencePlace = placeMatch ? placeMatch[1] : null;

      const characteristics = [fields['身長'], fields['身体特徴']].filter(Boolean).join('、') || null;

      const slug = `kanagawa-${i}`;
      const detailUrl = `${LIST_URL}#${slug}`;

      const detail = {
        title: fields['罪名'] || null,
        suspectName,
        occurrencePlace,
        stationName,
        phone,
        characteristics,
        photoUrl,
        sourceUrl: detailUrl,
        // 政府標準利用規約に基づく出典表記。画面に必ず一緒に表示すること。
        sourceLabel: `出典:神奈川県警察ホームページ(${LIST_URL})`,
      };
      detailCache.set(detailUrl, detail);

      items.push({
        detailUrl,
        thumbnailUrl: photoUrl,
        listText: nameRaw,
      });
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
  id: 'kanagawa',
  name: '神奈川県警察',
  fetchList,
  fetchDetail,
};
