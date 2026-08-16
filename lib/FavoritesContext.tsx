// lib/FavoritesContext.tsx
// 「お気に入り」タブで表示するために、一覧でお気に入り登録した被疑者情報を保持する。
// AsyncStorageに保存し、アプリ再起動後も復元する。

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ExtensionStorage } from '@bacons/apple-targets';
import { WantedListItem } from './types';

const STORAGE_KEY = 'wantedWatch:favorites';
const APP_GROUP = 'group.com.ktn935.wantedwatch';
const widgetStorage = Platform.OS === 'ios' ? new ExtensionStorage(APP_GROUP) : null;

type FavoritesContextValue = {
  favorites: WantedListItem[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: WantedListItem) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoritesMap, setFavoritesMap] = useState<Record<string, WantedListItem>>({});
  const hasLoaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setFavoritesMap(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('お気に入りの読み込みに失敗しました', e);
      } finally {
        hasLoaded.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    // 読み込み完了前に空データで上書きしてしまわないようにガードする
    if (!hasLoaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favoritesMap)).catch((e) => {
      console.warn('お気に入りの保存に失敗しました', e);
    });

    // ウィジェット(App Group経由)にもお気に入りIDを共有し、ローテーションに反映させる
    if (widgetStorage) {
      try {
        widgetStorage.set('favoriteIds', JSON.stringify(Object.keys(favoritesMap)));
        ExtensionStorage.reloadWidget();
      } catch (e) {
        console.warn('ウィジェットへのお気に入り共有に失敗しました', e);
      }
    }
  }, [favoritesMap]);

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
    () => ({ favorites, isFavorite, toggleFavorite }),
    [favorites, favoritesMap]
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
