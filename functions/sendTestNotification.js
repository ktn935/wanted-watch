// functions/sendTestNotification.js
// 「近くの新着指名手配を通知」機能の疎通確認用。登録済みの購読者全員にテスト通知を送る。
// 使い方: node sendTestNotification.js

require('dotenv').config();

const admin = require('firebase-admin');
const axios = require('axios');

function loadCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }
  // eslint-disable-next-line global-require
  const serviceAccount = require('./serviceAccountKey.json');
  return admin.credential.cert(serviceAccount);
}

admin.initializeApp({ credential: loadCredential() });
const db = admin.firestore();

async function main() {
  const snapshot = await db.collection('pushSubscriptions').where('enabled', '==', true).get();
  if (snapshot.empty) {
    console.log('有効な購読者がいません(設定画面で通知をオンにしてください)');
    return;
  }

  const messages = snapshot.docs.map((doc) => ({
    to: doc.data().token,
    sound: 'default',
    title: 'テスト通知',
    body: 'これは全国指名手配GOからのテスト通知です。',
  }));

  const { data } = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  console.log(`${messages.length}件に送信しました`);
  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
