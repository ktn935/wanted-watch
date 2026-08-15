// functions/writeToFirestore.js
// sources/ に登録された都道府県警察サイトをスクレイピングし、Firestoreへ保存する。
// Firebase Cloud Functions(課金が必要なスケジュール実行)は使わず、
// このスクリプトをGitHub Actionsのcronなどから直接 `node writeToFirestore.js` で
// 実行する想定。
//
// 認証情報は以下のどちらかで渡す:
//   - 環境変数 FIREBASE_SERVICE_ACCOUNT_JSON にサービスアカウントキーのJSON文字列を設定
//     (GitHub Actionsではこちらを使う。Secretsの値をそのまま渡せる)
//   - functions/serviceAccountKey.json を配置する(ローカル動作確認用。.gitignore対象)

require('dotenv').config();

const crypto = require('crypto');
const admin = require('firebase-admin');
const { scrapeAll } = require('./scrapeAll');
const { geocode } = require('./geocode');

function loadCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }
  try {
    // eslint-disable-next-line global-require
    const serviceAccount = require('./serviceAccountKey.json');
    return admin.credential.cert(serviceAccount);
  } catch (e) {
    throw new Error(
      '認証情報が見つかりません。環境変数 FIREBASE_SERVICE_ACCOUNT_JSON を設定するか、' +
        'functions/serviceAccountKey.json を配置してください。'
    );
  }
}

admin.initializeApp({ credential: loadCredential() });
const db = admin.firestore();

async function updateWantedList() {
  const items = await scrapeAll();
  const batch = db.batch();

  for (const item of items) {
    // 現在地との距離計算用に、発生現場→ダメなら警察署名の順で緯度経度を取得
    const location = (await geocode(item.occurrencePlace)) || (await geocode(item.stationName));

    // 出典URLをもとにドキュメントIDを作る(同じ事件を重複登録しないため)。
    // base64を単純に60文字で切り詰めると、URLの先頭が共通で末尾(#フラグメント等)
    // だけが違うケース(警察庁sourceなど)でIDが衝突してしまうため、ハッシュ化する。
    const docId = crypto.createHash('sha256').update(item.sourceUrl).digest('hex').slice(0, 40);

    const ref = db.collection('wantedSuspects').doc(docId);
    batch.set(ref, {
      title: item.title,
      suspectName: item.suspectName,
      occurrencePlace: item.occurrencePlace,
      stationName: item.stationName,
      phone: item.phone,
      characteristics: item.characteristics,
      photoUrl: item.photoUrl,
      sourceId: item.sourceId,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      sourceLabel: item.sourceLabel,
      location: location ? new admin.firestore.GeoPoint(location.lat, location.lng) : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`${items.length}件の指名手配情報を更新しました`);
}

if (require.main === module) {
  updateWantedList()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('Firestoreへの書き込みに失敗しました', e);
      process.exit(1);
    });
}

module.exports = { updateWantedList };
