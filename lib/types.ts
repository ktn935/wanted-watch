// lib/types.ts
// 一覧・お気に入り画面(WantedCardなど)が表示に使う共通の形。
// Firestore由来のWantedSuspect(wantedApi.ts)・ダミーデータのMockWantedSuspect
// (mockWantedData.ts)のどちらも、この形を満たす(データ取得元の違いをUI側が気にしなくて済む)。

export type WantedListItem = {
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
  rewardAmount?: number | null;
  distanceKm?: number;
};
