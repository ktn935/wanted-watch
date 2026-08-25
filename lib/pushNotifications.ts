// lib/pushNotifications.ts
// 「近くの新着指名手配を通知」機能のためのプッシュ通知登録/解除ブリッジ。
// 通知トークン+おおよその位置情報をFirestore(pushSubscriptions)に保存し、
// functions/notifyNewSuspects.js が新規追加時にマッチする購読者へ送信する。

import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export const DEFAULT_RADIUS_KM = 20;

async function requestExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenResponse.data;
}

// 通知をオンにする。位置情報のパーミッションも別途必要(一覧画面で既に許可済みのはず)。
// 成功時は今後の解除に使うトークンを返す。
export async function enableNearbyNotifications(
  radiusKm: number = DEFAULT_RADIUS_KM
): Promise<string | null> {
  const token = await requestExpoPushToken();
  if (!token) return null;

  const position = await Location.getCurrentPositionAsync({});
  // プライバシーポリシー上「おおよその位置情報」と明記しているため、
  // サーバーには約1km単位に丸めた座標のみを保存する(20km圏内の通知判定には十分な精度)。
  const roundCoord = (value: number) => Math.round(value * 100) / 100;

  await setDoc(doc(db, 'pushSubscriptions', token), {
    token,
    latitude: roundCoord(position.coords.latitude),
    longitude: roundCoord(position.coords.longitude),
    radiusKm,
    enabled: true,
    updatedAt: new Date().toISOString(),
  });

  return token;
}

export async function disableNearbyNotifications(token: string): Promise<void> {
  await setDoc(
    doc(db, 'pushSubscriptions', token),
    { enabled: false, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}
