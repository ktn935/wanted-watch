// lib/regions.ts
// 都道府県を地方区分にまとめるための定義。一覧画面のフィルターで使用する。
// ユーザー指定の区分に従う(一般的な地理区分と異なり、山梨・長野を北関東に含む等)。

export const REGIONS: { name: string; prefectures: string[] }[] = [
  { name: '北海道', prefectures: ['北海道'] },
  { name: '東北', prefectures: ['青森県', '岩手県', '秋田県', '宮城県', '山形県', '福島県'] },
  { name: '北関東', prefectures: ['茨城県', '栃木県', '群馬県', '山梨県', '長野県'] },
  { name: '南関東', prefectures: ['埼玉県', '千葉県', '東京都', '神奈川県'] },
  { name: '東海', prefectures: ['静岡県', '岐阜県', '愛知県', '三重県'] },
  { name: '北陸', prefectures: ['新潟県', '富山県', '石川県', '福井県'] },
  { name: '近畿', prefectures: ['滋賀県', '京都府', '奈良県', '和歌山県', '大阪府', '兵庫県'] },
  { name: '中国', prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
  { name: '四国', prefectures: ['徳島県', '香川県', '愛媛県', '高知県'] },
  { name: '九州', prefectures: ['福岡県', '佐賀県', '長崎県', '大分県', '熊本県', '宮崎県', '鹿児島県'] },
  { name: '沖縄', prefectures: ['沖縄県'] },
];

const NATIONWIDE_LABEL = '全国';

// FirestoreのsourceName("神奈川県警察"、"警視庁"、"警察庁"等)から都道府県名を導出する。
// 警察庁(全国区分)はnullを返す。
export function prefectureFromSourceName(sourceName: string | null | undefined): string | null {
  if (!sourceName) return null;
  if (sourceName === '警視庁') return '東京都';
  if (sourceName === '警察庁') return null;
  return sourceName.replace(/警察$/, '');
}

// FirestoreのsourceNameから地方区分名を導出する。
// 警察庁(全国)は「全国」、対応する地方が見つからない場合はnullを返す。
export function regionFromSourceName(sourceName: string | null | undefined): string | null {
  if (sourceName === '警察庁') return NATIONWIDE_LABEL;
  const pref = prefectureFromSourceName(sourceName);
  if (!pref) return null;
  const region = REGIONS.find((r) => r.prefectures.includes(pref));
  return region ? region.name : null;
}

export { NATIONWIDE_LABEL };
