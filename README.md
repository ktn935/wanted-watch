# 全国指名手配GO

警視庁が公開する指名手配情報を、現在地から近い順に表示するアプリの実装スターターコードです。
stalogと同じ Expo/React Native + Firebase 構成を想定しています。

## 全体の流れ

1. **functions/** (サーバー側): 1日1回、警視庁サイトをスクレイピングしFirestoreに保存
2. **app/** (アプリ側): Firestoreから取得し、現在地からの距離順に一覧表示

出典表記(`出典:警視庁ホームページ(URL)`)は各データに自動で付与され、画面にも表示されます。政府標準利用規約の条件(出典明記・改変しない)を満たすため、この表記は削除しないでください。

---

## セットアップ手順

### 1. サーバー側(functions)

```bash
cd functions
npm install
```

`.env.example` を `.env` にコピーし、Google Cloud ConsoleでGeocoding APIを有効化して取得したAPIキーを設定してください。

スクレイピング単体テスト:

```bash
npm run test-scrape
```

正しく動けば、指名手配被疑者の情報がJSON形式でコンソールに出力されます。
**警視庁サイトのHTML構造が変わっていた場合、ここでエラーになったりデータが取れなかったりします。** その際は `functions/sources/keishicho.js` 内のセレクタ(見出しの探し方や画像の絞り込み条件)を、実際のページのHTMLを見ながら調整してください。

### サイトの追加(都道府県警察サイトを増やす場合)

`functions/sources/` 配下に、参照するサイトごとの取得ロジックをsourceとして登録しています。新しいサイトを追加するときは、`functions/sources/keishicho.js` を参考に新しいファイルを1つ作り(`id`・`name`・`fetchList`・`fetchDetail` を実装)、`functions/sources/index.js` の配列に追加するだけで済みます。共通処理(`functions/scrapeAll.js`)やアプリ側は変更不要です。

Firebaseへのデプロイ(Firebase CLIのセットアップ・ログインが済んでいる前提):

```bash
firebase deploy --only functions
```

### 2. アプリ側(app)

`app/lib/wantedApi.ts` が参照している `./firebaseConfig` は、stalogで使っているFirebase初期化ファイルと同じ形式です。stalogプロジェクトの `firebaseConfig.ts` (または同等のファイル)をコピーして使ってください。

位置情報を使うため、Expoプロジェクトに `expo-location` が必要です。

```bash
npx expo install expo-location
```

`app.json` の `expo.plugins` に位置情報の利用目的メッセージを追加してください(例):

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "現在地から近い指名手配情報を表示するために使用します。"
        }
      ]
    ]
  }
}
```

`WantedListScreen.tsx` を `app/(tabs)/wanted.tsx` などファイルベースルーティングの場所に配置し、タブに追加してください。

---

## ウィジェット対応について

stalogで導入済みの `expo-widgets` を使い、同じ要領でホーム画面ウィジェットに以下を表示する想定です。

- 最も近い指名手配被疑者の氏名・距離・管轄警察署
- タップでアプリを開く

ウィジェット部分は、stalogのウィジェット実装(連続記録日数表示)を参考に、表示データを「連続記録日数」から「最も近い被疑者情報」に置き換える形で進めるのがスムーズです。実装時はまた声をかけてください。

---

## 今後の拡張候補

- 現状は「指名手配」ページ(全国最重要指名手配)のみ対象。「殺人」「強盗」など罪種別一覧ページも対象にする場合は、`scrapeWanted.js` の `fetchWantedList` を罪種別ページ用に増やし、`fetchWantedDetail` はそのまま流用可能
- 出典表記に加え、詳細画面に「懸賞金」「情報提供先」なども表示すると、警視庁サイトの目的(情報提供の呼びかけ)により合致する
