// lib/widgetDiagnostics.ts
// ウィジェット連携(App Group経由でのデータ共有)が正しく動いているかを、
// Mac無しでも画面上から確認できるようにするための診断用ヘルパー。
// 問題の切り分けが済んだら、この機能ごと削除して構わない。

import { Platform } from 'react-native';
import { ExtensionStorage } from '@bacons/apple-targets';

const APP_GROUP = 'group.com.ktn935.wantedwatch';
const widgetStorage = Platform.OS === 'ios' ? new ExtensionStorage(APP_GROUP) : null;

// @bacons/apple-targetsは、ネイティブモジュールが未リンクの場合
// 何もしないスタブにフォールバックする。expo.modules.ExtensionStorageの有無で
// 実際にネイティブ側と繋がっているかを判定する。
export function isExtensionStorageLinked(): boolean {
  const g = global as any;
  return Boolean(g.expo?.modules?.ExtensionStorage);
}

export function readWidgetFavoritesRaw(): string | null {
  if (!widgetStorage) return null;
  try {
    return widgetStorage.get('favorites') ?? null;
  } catch (e) {
    return `読み取りエラー: ${String(e)}`;
  }
}
