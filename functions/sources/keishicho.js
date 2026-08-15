// sources/keishicho.js
// 警視庁「指名手配」ページから被疑者情報を取得するsource。
//
// 出典: 警視庁ホームページ (https://www.keishicho.metro.tokyo.lg.jp/)
// 警視庁は政府標準利用規約を採用しており、出典明記・内容を改変しないことを条件に
// 複製・表示が可能です。取得したデータには必ず sourceLabel(出典表記)を
// 画面に一緒に表示してください。
//
// 【注意】警視庁サイトのHTML構造は事件ページごとに癖があります。
// エラーが出たり不自然なデータが取れたりする場合は、まずここを見直してください。

const axios = require('axios');
const cheerio = require('cheerio');
const { REQUEST_HEADERS } = require('./shared');

const BASE_URL = 'https://www.keishicho.metro.tokyo.lg.jp';
const LIST_URL = `${BASE_URL}/jiken_jiko/ichiran_jiken/tehai.html`;

// 一覧ページから、各被疑者の詳細ページURL・サムネイル画像・罪種テキストを取得
async function fetchList() {
  const { data: html } = await axios.get(LIST_URL, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  const items = [];
  $('a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    // 事件の詳細ページは /jiken_jiko/ichiran/... という形式。
    // グローバルナビの「事件・事故」(/jiken_jiko/index.html)や
    // 罪種一覧(/jiken_jiko/ichiran_jiken/...)はこれで除外される。
    if (!href || !href.includes('/jiken_jiko/ichiran/')) return;

    // 写真ありのケースは <a><img></a><br><span>殺人事件 見立 真一</span> のように
    // aタグとimg・写真キャプションが同じ親要素に並ぶ構造。
    // 写真なしのケースは <a>下連雀三丁目薬局店内強盗殺人事件</a> のようにリンク文字列のみ。
    const img = $el.find('img').attr('src');
    const text = $el.parent().text().replace(/\s+/g, ' ').trim();

    items.push({
      detailUrl: new URL(href, BASE_URL).toString(),
      thumbnailUrl: img ? new URL(img, BASE_URL).toString() : null,
      listText: text,
    });
  });

  // 同じ詳細ページが複数回リンクされることがあるため重複除去
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.detailUrl)) return false;
    seen.add(item.detailUrl);
    return true;
  });
}

// 詳細ページから、氏名・写真・発生現場・情報発信元(警察署+電話番号)を取得
async function fetchDetail(detailUrl) {
  const { data: html } = await axios.get(detailUrl, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();

  // 見出し(h2/h3)の直後にある本文要素を返すヘルパー。
  // このサイトの見出しは
  //   <div class="h2bg"><div><h2>発生現場</h2></div></div><div class="wysiwyg_wp">...</div>
  //   <div class="h3bg"><div><h3>氏名</h3></div></div><div class="wysiwyg_wp">...</div>
  // のように見出しが二重にラップされ、本文はラップ用divの兄弟要素になっているページと、
  //   <div class="contact"><h2>情報発信元</h2><p>...</p></div>
  // のように見出しと本文が同じ親を共有するページが混在しているため、
  // 見出し要素がh2bg/h3bgでラップされていればラップ要素を、そうでなければ見出し要素自身を
  // 基準にして「次の見出し(h2bg/h3bgも含む)まで」の要素を集める。
  const HEADING_STOP_SELECTOR = 'h2, h3, .h2bg, .h3bg';

  const sectionElements = (headingKeyword) => {
    let $content = $();
    $('h2, h3').each((_, h) => {
      const $h = $(h);
      // 完全一致で見出しを探す(includes()だと「発生場所」が「発生場所の地図」に
      // 誤ってマッチしてしまうため)
      if ($h.text().trim() !== headingKeyword) return;

      let $container = $h;
      if ($h.parent().parent().is('.h2bg, .h3bg')) {
        $container = $h.parent().parent();
      } else if ($h.parent().is('.h2bg, .h3bg')) {
        $container = $h.parent();
      }
      $content = $container.nextUntil(HEADING_STOP_SELECTOR);
    });
    return $content;
  };

  const sectionText = (headingKeyword) =>
    sectionElements(headingKeyword).text().replace(/\s+/g, ' ').trim();

  // ページによって「発生現場」「発生場所」と表記ゆれがあるため両方試す
  const occurrencePlace = sectionText('発生現場') || sectionText('発生場所');
  const sourceBlock = sectionText('情報発信元');

  // 「警視庁 麻布警察署 殺人事件捜査本部 電話：03-3479-0110」のような文字列から
  // 電話番号と警察署名を分離
  const phoneMatch = sourceBlock.match(/(0\d{1,4}-\d{1,4}-\d{3,4})/);
  const phone = phoneMatch ? phoneMatch[1] : null;
  const stationName = sourceBlock.replace(/電話[：:].*$/, '').trim() || null;

  // 被疑者の顔写真。「指名手配被疑者」セクション内の最初の画像を採用する
  // (ページ全体から探すと、ヘッダーロゴなど無関係な画像に先にマッチしてしまうため)。
  const $suspectSection = sectionElements('指名手配被疑者');
  const photoUrl = $suspectSection.find('img').first().attr('src');

  // 氏名(「見立 真一（みたて しんいち）」「李 会（リ フォイ）」のような
  // ひらがな/カタカナのふりがな付きパターン)を取得する。
  // 「氏名」という小見出しがあればその内容を優先し(「異名」「別名」等の
  // 別セクションと混同しないため)、無ければ「指名手配被疑者」セクション全体から探す。
  // ※「氏名」小見出しも無いページでは、セクション内に別名が併記されている場合に
  //   誤って別名を拾ってしまう可能性が残るため、その際は個別に手動確認・調整が必要。
  const nameSourceText = sectionText('氏名') || $suspectSection.text();
  const nameMatch = nameSourceText.match(
    /([一-龥ぁ-んァ-ヶー]{1,4}\s?[一-龥ぁ-んァ-ヶー]{1,4})[（(]([ぁ-んァ-ヶー、\s]+)[）)]/
  );
  const suspectName = nameMatch ? nameMatch[1].trim() : null;

  // 発見の手がかりになる身体的特徴(身長・体格・創痕など)。「身体特徴」小見出しがあれば使う。
  // 「<li>身長<br>167センチメートル位</li>」のようなリスト構造の場合は、
  // 項目ごとに「身長：167センチメートル位」の形に整形してから連結する
  // (.text()だけだと区切りが無く読みにくくなるため)。
  const $characteristicsItems = sectionElements('身体特徴').find('li');
  const characteristics =
    ($characteristicsItems.length > 0
      ? $characteristicsItems
          .map((_, li) => {
            const itemHtml = $(li).html() || '';
            return itemHtml
              .split(/<br\s*\/?>/i)
              .map((s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
              .filter(Boolean)
              .join('：');
          })
          .get()
          .join('、')
      : sectionText('身体特徴')) || null;

  return {
    title,
    suspectName,
    occurrencePlace: occurrencePlace || null,
    stationName,
    phone,
    characteristics,
    photoUrl: photoUrl ? new URL(photoUrl, BASE_URL).toString() : null,
    sourceUrl: detailUrl,
    // 政府標準利用規約に基づく出典表記。画面に必ず一緒に表示すること。
    sourceLabel: `出典:警視庁ホームページ(${detailUrl})`,
  };
}

module.exports = {
  id: 'keishicho',
  name: '警視庁',
  fetchList,
  fetchDetail,
};
