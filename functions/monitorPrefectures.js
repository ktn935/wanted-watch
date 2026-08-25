// functions/monitorPrefectures.js
// まだ実装していない都道府県警察サイトを月1回チェックし、ページ内容が変化していないか
// 監視するスクリプト。GitHub Actions(monthly-prefecture-check.yml)から実行される。
//
// 「氏名+顔写真が取得できるようになったか」を完全自動で判定するのは信頼性が低いため、
// このスクリプトはページのテキスト内容が前回チェック時から変化したかどうかだけを検出する。
// 変化があったページは、実際に取得可能になったかどうかを人間(またはAIエージェント)が
// 確認する必要があるフラグとして扱う。

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const { REQUEST_HEADERS } = require('./sources/shared');

const STATE_PATH = path.join(__dirname, 'prefectureWatchState.json');

// 2026-08-26時点で「氏名+顔写真とも取得不可」と判定した都道府県サイト一覧。
// 実装済み(取得可能)の都道府県はここに含めない。
const WATCH_TARGETS = [
  { prefecture: '青森県', url: 'https://www.police.pref.aomori.jp/keijibu/keiji_kikaku/tehai_kyoujo.html' },
  { prefecture: '宮城県', url: 'https://www.police.pref.miyagi.jp/keiso/tehai/index.html' },
  { prefecture: '秋田県', url: 'https://www.police.pref.akita.lg.jp/odate/news/simeitehai' },
  { prefecture: '山形県', url: 'https://www.pref.yamagata.jp/800054/kensei/police/yamagatakenkeisatsu/profile/shimeitehai.html' },
  { prefecture: '福島県', url: 'https://www.police.pref.fukushima.jp/10.jyouhou/-keiji/-jiken/johofiles/miharu01.html' },
  { prefecture: '栃木県', url: 'https://www.pref.tochigi.lg.jp/keisatu/n18/poster.html' },
  { prefecture: '群馬県', url: 'https://www.police.pref.gunma.jp/28468.html' },
  { prefecture: '埼玉県', url: 'https://www.police.pref.saitama.lg.jp/e0010/kurashi/sousakyouryoku1.html' },
  { prefecture: '新潟県', url: 'https://www.pref.niigata.lg.jp/site/kenkei/onegai-hyousi1-tehai.html' },
  { prefecture: '富山県', url: 'https://police.pref.toyama.jp/6125/anzen/seikatsuanzen/sousa/simeitehaigekkann.html' },
  { prefecture: '石川県', url: 'https://www2.police.pref.ishikawa.lg.jp/security/security18/security18_04/security01.html' },
  { prefecture: '福井県', url: 'https://www.pref.fukui.lg.jp/kenkei/doc/kenkei/naka50.html' },
  { prefecture: '長野県', url: 'https://www.pref.nagano.lg.jp/police/sousa/hansou/tehai.html' },
  { prefecture: '岐阜県', url: 'https://www.pref.gifu.lg.jp/site/police/4058.html' },
  { prefecture: '三重県', url: 'http://www.police.pref.mie.jp/provide_info/' },
  { prefecture: '滋賀県', url: 'https://www.pref.shiga.lg.jp/police/onegai/jikenzyouhou/348110.html' },
  { prefecture: '京都府', url: 'http://www.pref.kyoto.jp/fukei/site/sousa/keiki/index.html' },
  { prefecture: '兵庫県', url: 'https://www.police.pref.hyogo.lg.jp/teikyo/sosa/index.htm' },
  { prefecture: '奈良県', url: 'http://www.police.pref.nara.jp/0000000302.html' },
  { prefecture: '和歌山県', url: 'https://www.police.pref.wakayama.lg.jp/01_anzen/index.html' },
  { prefecture: '鳥取県', url: 'http://www.pref.tottori.lg.jp/dd.aspx?menuid=33947' },
  { prefecture: '島根県', url: 'http://www.pref.shimane.lg.jp/police/01_safety_of_life/wanted_incident/' },
  { prefecture: '岡山県', url: 'https://www.pref.okayama.jp/page/400718.html' },
  { prefecture: '広島県', url: 'https://www.pref.hiroshima.lg.jp/site/police12/tehai.html' },
  { prefecture: '徳島県', url: 'http://www.police.pref.tokushima.jp/03jyouho/' },
  { prefecture: '香川県', url: 'https://www.pref.kagawa.lg.jp/police/otazune/hannintehai/index.html' },
  { prefecture: '愛媛県', url: 'http://www.police.pref.ehime.jp/wanted/kennaitehai/matuyamanisi.html' },
  { prefecture: '高知県', url: 'https://www.police.pref.kochi.lg.jp/category/bumon/keiji/kikaku/' },
  { prefecture: '佐賀県', url: 'https://www.police.pref.saga.jp/shimeitehai_teikyo.html' },
  { prefecture: '長崎県', url: 'https://www.police.pref.nagasaki.jp/police/kurashi/joho-teikyo/shimei-tehai/' },
  { prefecture: '熊本県', url: 'https://www.pref.kumamoto.jp/site/police/8603.html' },
  { prefecture: '大分県', url: 'http://www.pref.oita.jp/site/keisatu/tehaichu.html' },
  { prefecture: '宮崎県', url: 'https://www.pref.miyazaki.lg.jp/police/invest/simeitehai.html' },
  { prefecture: '鹿児島県', url: 'http://www.pref.kagoshima.jp/ja07/police/onegai/index.html' },
];

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function normalizedTextHash(html) {
  const $ = cheerio.load(html);
  $('script, style').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function main() {
  const state = loadState();
  const changed = [];
  const failed = [];

  for (const { prefecture, url } of WATCH_TARGETS) {
    try {
      const { data: html } = await axios.get(url, {
        headers: REQUEST_HEADERS,
        timeout: 15000,
        validateStatus: (status) => status < 500,
      });
      const hash = normalizedTextHash(html);
      const previous = state[prefecture]?.hash;

      if (previous && previous !== hash) {
        changed.push({ prefecture, url });
      }
      state[prefecture] = { hash, url, checkedAt: new Date().toISOString() };
    } catch (error) {
      failed.push({ prefecture, url, error: error.message });
      // 取得失敗はページ内容の変化と区別できないため、既存のhashは上書きしない
      // (次回リトライで復旧すればそのまま追跡を継続できる)。
    }
  }

  saveState(state);

  console.log(`チェック対象: ${WATCH_TARGETS.length}件`);
  console.log(`内容に変化があった都道府県: ${changed.length}件`);
  if (changed.length > 0) {
    for (const c of changed) {
      console.log(`  - ${c.prefecture}: ${c.url}`);
    }
  }
  if (failed.length > 0) {
    console.log(`取得に失敗した都道府県: ${failed.length}件`);
    for (const f of failed) {
      console.log(`  - ${f.prefecture}: ${f.error}`);
    }
  }

  // GitHub Actions側でIssue作成の判断に使うため、変化があった一覧をファイルに書き出す
  fs.writeFileSync(
    path.join(__dirname, 'prefectureWatchChanged.json'),
    JSON.stringify(changed, null, 2) + '\n',
    'utf8'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
