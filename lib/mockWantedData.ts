// lib/mockWantedData.ts
// Firebase/Firestoreを未設定でもExpo Goで動作確認できるようにするためのダミーデータ。
// firebaseConfig.ts を用意したら lib/wantedApi.ts の fetchWantedSuspects に差し替える。

import { distanceKm } from './distance';

export type MockWantedSuspect = {
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
  location: { latitude: number; longitude: number } | null;
  rewardAmount: number | null;
  distanceKm?: number;
};

const RAW_ITEMS: Omit<MockWantedSuspect, 'distanceKm'>[] = [
  {
    id: 'mock-1',
    title: '強盗致傷事件',
    suspectName: '山田 太郎(仮)',
    occurrencePlace: '東京都渋谷区',
    stationName: '渋谷警察署',
    phone: '03-0000-0001',
    characteristics: '身長170センチメートル位、黒縁眼鏡、右手首に傷痕',
    photoUrl: null,
    sourceUrl: 'https://www.keishicho.metro.tokyo.lg.jp/',
    sourceLabel: '出典:警視庁ホームページ(https://www.keishicho.metro.tokyo.lg.jp/)',
    location: { latitude: 35.6595, longitude: 139.7005 },
    rewardAmount: 1000000,
  },
  {
    id: 'mock-2',
    title: '殺人事件',
    suspectName: '佐藤 次郎(仮)',
    occurrencePlace: '東京都新宿区',
    stationName: '新宿警察署',
    phone: '03-0000-0002',
    characteristics: '身長165センチメートル位、痩せ型、左頬に大きめのほくろ',
    photoUrl: null,
    sourceUrl: 'https://www.keishicho.metro.tokyo.lg.jp/',
    sourceLabel: '出典:警視庁ホームページ(https://www.keishicho.metro.tokyo.lg.jp/)',
    location: { latitude: 35.6938, longitude: 139.7036 },
    rewardAmount: 3000000,
  },
  {
    id: 'mock-3',
    title: '窃盗事件',
    suspectName: null,
    occurrencePlace: '東京都台東区',
    stationName: '上野警察署',
    phone: '03-0000-0003',
    characteristics: null,
    photoUrl: null,
    sourceUrl: 'https://www.keishicho.metro.tokyo.lg.jp/',
    sourceLabel: '出典:警視庁ホームページ(https://www.keishicho.metro.tokyo.lg.jp/)',
    location: { latitude: 35.7078, longitude: 139.7745 },
    rewardAmount: null,
  },
  {
    id: 'mock-4',
    title: '詐欺事件(位置情報なし)',
    suspectName: '不明',
    occurrencePlace: null,
    stationName: '池袋警察署',
    phone: null,
    characteristics: '灰色のパーカー、黒いキャップを着用していたとの目撃情報あり',
    photoUrl: null,
    sourceUrl: 'https://www.keishicho.metro.tokyo.lg.jp/',
    sourceLabel: '出典:警視庁ホームページ(https://www.keishicho.metro.tokyo.lg.jp/)',
    location: null,
    rewardAmount: 500000,
  },
];

export async function fetchMockWantedSuspects(
  currentLat: number,
  currentLon: number
): Promise<MockWantedSuspect[]> {
  const items: MockWantedSuspect[] = RAW_ITEMS.map((raw) => {
    const item: MockWantedSuspect = { ...raw };
    if (item.location) {
      item.distanceKm = distanceKm(
        currentLat,
        currentLon,
        item.location.latitude,
        item.location.longitude
      );
    }
    return item;
  });

  return items.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}
