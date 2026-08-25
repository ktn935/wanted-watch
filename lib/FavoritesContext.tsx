// lib/FavoritesContext.tsx
// 「お気に入り」タブで表示するために、一覧でお気に入り登録した被疑者情報を保持する。
// AsyncStorageに保存し、アプリ再起動後も復元する。

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ExtensionStorage } from '@bacons/apple-targets';
import { WantedListItem } from './types';
import { startOrUpdateActivity, endActivity } from '@/modules/live-activity';

const STORAGE_KEY = 'wantedWatch:favorites';
const LIVE_ACTIVITY_PREF_KEY = 'wantedWatch:liveActivityEnabled';
const APP_GROUP = 'group.com.ktn935.wantedwatch';
const widgetStorage = Platform.OS === 'ios' ? new ExtensionStorage(APP_GROUP) : null;

type FavoritesContextValue = {
  favorites: WantedListItem[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: WantedListItem) => void;
  liveActivityEnabled: boolean;
  setLiveActivityEnabled: (enabled: boolean) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoritesMap, setFavoritesMap] = useState<Record<string, WantedListItem>>({});
  const [liveActivityEnabled, setLiveActivityEnabledState] = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setFavoritesMap(JSON.parse(stored));
        }
        const storedPref = await AsyncStorage.getItem(LIVE_ACTIVITY_PREF_KEY);
        if (storedPref != null) {
          setLiveActivityEnabledState(storedPref === 'true');
        }
      } catch (e) {
        console.warn('お気に入りの読み込みに失敗しました', e);
      } finally {
        hasLoaded.current = true;
      }
    })();
  }, []);

  const setLiveActivityEnabled = (enabled: boolean) => {
    setLiveActivityEnabledState(enabled);
    AsyncStorage.setItem(LIVE_ACTIVITY_PREF_KEY, String(enabled)).catch((e) => {
      console.warn('Live Activity設定の保存に失敗しました', e);
    });
  };

  useEffect(() => {
    // 読み込み完了前に空データで上書きしてしまわないようにガードする
    if (!hasLoaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favoritesMap)).catch((e) => {
      console.warn('お気に入りの保存に失敗しました', e);
    });

    // ウィジェット(App Group経由)にもお気に入りの中身を共有する。
    // ウィジェット側は位置情報取得やFirestoreへの直接アクセスを一切行わず、
    // ここで書き込んだデータをそのまま表示するだけのシンプルな作りにしている。
    if (widgetStorage) {
      try {
        const widgetFavorites = Object.values(favoritesMap).map((item) => ({
          id: item.id,
          suspectName: item.suspectName,
          title: item.title,
          stationName: item.stationName,
          photoUrl: item.photoUrl,
          sourceUrl: item.sourceUrl,
        }));
        widgetStorage.set('favorites', JSON.stringify(widgetFavorites));
        ExtensionStorage.reloadWidget();
      } catch (e) {
        console.warn('ウィジェットへのお気に入り共有に失敗しました', e);
      }
    }

    // ロック画面/Dynamic IslandのLive Activityは、最後にお気に入り登録した1件を表示する。
    // お気に入りが無くなった場合、または設定でオフにされている場合は終了する。
    if (Platform.OS === 'ios') {
      const items = Object.values(favoritesMap);
      if (!liveActivityEnabled || items.length === 0) {
        endActivity();
      } else {
        const latest = items[items.length - 1];
        startOrUpdateActivity({
          suspectName: latest.suspectName ?? '不明',
          title: latest.title ?? '不明',
          stationName: latest.stationName,
          photoUrl: latest.photoUrl,
        });
      }
    }
  }, [favoritesMap, liveActivityEnabled]);

  const toggleFavorite = (item: WantedListItem) => {
    setFavoritesMap((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = item;
      }
      return next;
    });
  };

  const isFavorite = (id: string) => Boolean(favoritesMap[id]);

  const favorites = useMemo(() => Object.values(favoritesMap), [favoritesMap]);

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, liveActivityEnabled, setLiveActivityEnabled }),
    [favorites, favoritesMap, liveActivityEnabled]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return ctx;
}
