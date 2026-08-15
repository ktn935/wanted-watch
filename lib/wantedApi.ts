// lib/wantedApi.ts
// Firestoreから指名手配情報を取得し、現在地からの距離が近い順に並べる。
// firebaseConfig.ts はstalogと同様にFirebaseプロジェクトの初期化を行うファイルを想定しています。

import { collection, getDocs, GeoPoint, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { distanceKm } from './distance';

export type WantedSuspect = {
  id: string;
  title: string;
  suspectName: string | null;
  occurrencePlace: string | null;
  stationName: string | null;
  phone: string | null;
  characteristics: string | null;
  photoUrl: string | null;
  sourceUrl: string;
  sourceLabel: string;
  location: GeoPoint | null;
  rewardAmount?: number | null;
  distanceKm?: number;
};

export async function fetchWantedSuspects(
  currentLat: number,
  currentLon: number
): Promise<WantedSuspect[]> {
  const snapshot = await getDocs(collection(db, 'wantedSuspects'));

  const items: WantedSuspect[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
    const data = doc.data() as Omit<WantedSuspect, 'id' | 'distanceKm'>;
    const item: WantedSuspect = { id: doc.id, ...data };

    if (data.location) {
      item.distanceKm = distanceKm(
        currentLat,
        currentLon,
        data.location.latitude,
        data.location.longitude
      );
    }
    return item;
  });

  // 距離が近い順。位置情報が取れなかったものは末尾へ
  return items.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}
