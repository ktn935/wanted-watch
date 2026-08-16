// modules/live-activity/index.ts
// ロック画面/Dynamic Islandに指名手配情報を表示するLive Activity(iOS 16.2+)の
// 開始・更新・終了をJSから呼び出すためのブリッジ。Androidには存在しない機能なので、
// 呼び出し側はPlatform.OS === 'ios' でガードすること。

import { requireNativeModule } from 'expo-modules-core';

export type LiveActivityState = {
  suspectName: string;
  title: string;
  stationName: string | null;
  photoUrl: string | null;
};

type LiveActivityControllerNativeModule = {
  startOrUpdateActivity(stateJson: string): Promise<boolean>;
  endActivity(): Promise<void>;
  isActivityRunning(): boolean;
};

let nativeModule: LiveActivityControllerNativeModule | null = null;
function getNativeModule(): LiveActivityControllerNativeModule | null {
  if (nativeModule) return nativeModule;
  try {
    nativeModule = requireNativeModule<LiveActivityControllerNativeModule>(
      'LiveActivityController'
    );
    return nativeModule;
  } catch {
    // iOS 16.2未満のシミュレータ/実機やAndroidではネイティブモジュール自体が
    // リンクされていない可能性があるため、例外を握りつぶしてfalse相当を返す
    return null;
  }
}

// 開始済みなら内容を更新、未開始なら新規に開始する。
// iOS 16.2未満/Live Activityが無効な設定の場合はfalseを返す(呼び出し側でのエラー扱いは不要)。
export async function startOrUpdateActivity(state: LiveActivityState): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return false;
  try {
    return await module.startOrUpdateActivity(JSON.stringify(state));
  } catch (e) {
    console.warn('Live Activityの開始/更新に失敗しました', e);
    return false;
  }
}

export async function endActivity(): Promise<void> {
  const module = getNativeModule();
  if (!module) return;
  try {
    await module.endActivity();
  } catch (e) {
    console.warn('Live Activityの終了に失敗しました', e);
  }
}

export function isActivityRunning(): boolean {
  const module = getNativeModule();
  if (!module) return false;
  try {
    return module.isActivityRunning();
  } catch {
    return false;
  }
}
