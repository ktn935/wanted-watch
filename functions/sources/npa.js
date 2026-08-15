// sources/npa.js
// 警察庁が指定する「重要指名手配被疑者」一覧ページから被疑者情報を取得するsource。
// 全国の都道府県警察が扱う事件のうち、特に重大なものを警察庁がまとめて掲載しているため、
// 都道府県を1つずつ追加するより効率よく全国的なカバー範囲を広げられる。
//
// 出典: 警察庁Webサイト (https://www.npa.go.jp/)
//
// 【注意】このページには「小暮　洋史　こぐれ　ひろし（56歳）」のように
// 氏名・ふりがな・年齢が1つの見出しにまとまっている形式と、
// 「リン　ショウイ（52歳）」のようにカタカナ表記のみ(ふりがな無し)の形式が混在する。
// 発生現場・警察署名・電話番号はこのページには無く、都道府県警察サイトへの
// リンクとしてのみ掲載されている(今回はリンク先を辿って個別に解析することはしていない)。

const axios = require('axios');
const cheerio = require('cheerio');
const { REQUEST_HEADERS } = require('./shared');

const BASE_URL = 'https://www.npa.go.jp';
// 警察庁指定重要指名手配被疑者の一覧ページ(令和7年時点で1・2の2ページに分かれている)
const LIST_URLS = [
  `${BASE_URL}/bureau/criminal/wanted/jyuyo1.html`,
  `${BASE_URL}/bureau/criminal/wanted/jyuyo2.html`,
];

// このsourceは都道府県サイトと違い、一覧ページ自体に全被疑者の情報が載っており、
// 個別の詳細ページが存在しない。そのため fetchList() の時点で全項目を解析してキャッシュし、
// fetchDetail() はキャッシュから該当項目を返すだけにする。
const detailCache = new Map();

// 「小暮　洋史　こぐれ　ひろし（56歳）」→ "小暮　洋史"
// 「リン　ショウイ（52歳）」→ "リン　ショウイ"(ふりがな相当が無いのでそのまま)
function extractSuspectName(headingText) {
  const beforeParen = headingText.split(/[（(]/)[0].trim();
  const tokens = beforeParen.split(/\s+/).filter(Boolean);

  if (tokens.length >= 4 && tokens.length % 2 === 0) {
    // 氏名+ふりがなが半分ずつ並ぶ形式(まれに姓名が更に分かれ6分割等になることもあるが
    // その場合も前半を氏名とみなす)
    return tokens.slice(0, tokens.length / 2).join('　');
  }
  return tokens.join('　') || null;
}

async function fetchList() {
  const items = [];

  for (const pageUrl of LIST_URLS) {
    const { data: html } = await axios.get(pageUrl, { headers: REQUEST_HEADERS });
    const $ = cheerio.load(html);

    $('section').each((_, section) => {
      const $section = $(section);
      const $heading = $section.children('h2');
      const $box = $section.children('div.imgtxtBox');
      if ($heading.length === 0 || $box.length === 0) return; // 被疑者セクションではない

      const headingText = $heading.text().replace(/\s+/g, ' ').trim();
      const suspectName = extractSuspectName(headingText);

      const imgSrc = $box.find('img').attr('src');
      const photoUrl = imgSrc ? new URL(imgSrc, BASE_URL).toString() : null;

      // 画像ファイル名(拡張子抜き)を、このページ内で被疑者を一意に指すIDとして使う。
      // 出典ページ自体はjyuyo1/2.htmlで全員共通のため、フラグメントを付けて区別する。
      const slug = imgSrc
        ? imgSrc.split('/').pop().replace(/\.[a-zA-Z0-9]+$/, '')
        : `item-${items.length}`;
      const detailUrl = `${pageUrl}#${slug}`;

      // 「身長170cm位<br>殺人」のように身体特徴と罪種が1つの<p>に
      // 改行区切りでまとまっている。最後の行を罪種(事件名相当)、
      // それ以外の行を身体的特徴として使う
      const featureHtml = $box.find('.txtBox p').first().html() || '';
      const lines = featureHtml
        .split(/<br\s*\/?>/i)
        .map((line) => line.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      const crimeType = lines.length ? lines[lines.length - 1] : '';
      const characteristics = lines.slice(0, -1).join('、') || null;

      const detail = {
        title: crimeType || null,
        suspectName,
        occurrencePlace: null,
        stationName: null,
        phone: null,
        characteristics,
        photoUrl,
        sourceUrl: detailUrl,
        // 政府標準利用規約に基づく出典表記。画面に必ず一緒に表示すること。
        sourceLabel: `出典:警察庁ホームページ(${pageUrl})`,
      };
      detailCache.set(detailUrl, detail);

      items.push({
        detailUrl,
        thumbnailUrl: photoUrl,
        listText: headingText,
      });
    });
  }

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
  id: 'npa',
  name: '警察庁',
  fetchList,
  fetchDetail,
};
