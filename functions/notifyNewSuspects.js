// functions/notifyNewSuspects.js
// 新しく追加された指名手配情報について、近くにいる購読者にExpoのプッシュ通知を送る。
// 購読(pushSubscriptions)はアプリ側からFirestoreに直接書き込まれる(セキュリティルールで
// 自分のトークンのドキュメントのみ書き込み許可)。デフォルト半径は20km。

const axios = require('axios');
const { distanceKm } = require('./distance');

const DEFAULT_RADIUS_KM = 20;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_BATCH_SIZE = 100;

async function notifyNewSuspects(db, newItems) {
  const itemsWithLocation = newItems.filter((item) => item.location);
  if (itemsWithLocation.length === 0) {
    return;
  }

  const subsSnapshot = await db.collection('pushSubscriptions').where('enabled', '==', true).get();
  if (subsSnapshot.empty) {
    return;
  }

  const messages = [];
  for (const doc of subsSnapshot.docs) {
    const sub = doc.data();
    if (typeof sub.latitude !== 'number' || typeof sub.longitude !== 'number' || !sub.token) {
      continue;
    }
    const radiusKm = typeof sub.radiusKm === 'number' ? sub.radiusKm : DEFAULT_RADIUS_KM;

    const nearby = itemsWithLocation.filter(
      (item) => distanceKm(sub.latitude, sub.longitude, item.location.lat, item.location.lng) <= radiusKm
    );
    if (nearby.length === 0) continue;

    const first = nearby[0];
    const body =
      nearby.length === 1
        ? `${first.suspectName ?? '不明'}(${first.title ?? '詳細不明'})`
        : `${first.suspectName ?? '不明'} ほか${nearby.length - 1}件`;

    messages.push({
      to: sub.token,
      sound: 'default',
      title: '近くで新しい指名手配情報',
      body,
      data: { sourceUrl: first.sourceUrl },
    });
  }

  if (messages.length === 0) {
    console.log('通知対象の購読者はいませんでした');
    return;
  }

  for (let i = 0; i < messages.length; i += EXPO_PUSH_BATCH_SIZE) {
    const chunk = messages.slice(i, i + EXPO_PUSH_BATCH_SIZE);
    try {
      await axios.post(EXPO_PUSH_URL, chunk, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      });
    } catch (error) {
      console.error('プッシュ通知の送信に失敗しました', error.message);
    }
  }
  console.log(`${messages.length}件のプッシュ通知を送信しました`);
}

module.exports = { notifyNewSuspects };
