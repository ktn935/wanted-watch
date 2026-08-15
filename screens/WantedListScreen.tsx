// app/(tabs)/index.tsx から使われる一覧画面。
// 現在地を取得し、指名手配情報を一覧表示する。並び替え(距離/懸賞金)と
// 管轄警察署による絞り込みができる。タップすると出典元(警視庁の詳細ページ)をブラウザで開く。

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import { fetchWantedSuspects, WantedSuspect } from '../lib/wantedApi';
import { useFavorites } from '../lib/FavoritesContext';
import WantedCard from '../components/WantedCard';

type SortKey = 'distance' | 'reward';
const ALL_STATIONS = 'すべて';

export default function WantedListScreen() {
  const [items, setItems] = useState<WantedSuspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [stationFilter, setStationFilter] = useState<string>(ALL_STATIONS);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('位置情報の利用が許可されていません。設定から許可してください。');
          setLoading(false);
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        const data = await fetchWantedSuspects(
          position.coords.latitude,
          position.coords.longitude
        );
        setItems(data);
      } catch (e) {
        setErrorMessage('情報の取得に失敗しました: ' + (e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stationOptions = useMemo(() => {
    const names = items
      .map((item) => item.stationName)
      .filter((name): name is string => Boolean(name));
    return [ALL_STATIONS, ...Array.from(new Set(names))];
  }, [items]);

  const displayedItems = useMemo(() => {
    const filtered =
      stationFilter === ALL_STATIONS
        ? items
        : items.filter((item) => item.stationName === stationFilter);

    const sorted = [...filtered];
    if (sortKey === 'distance') {
      sorted.sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else {
      sorted.sort((a, b) => {
        if (a.rewardAmount == null && b.rewardAmount == null) return 0;
        if (a.rewardAmount == null) return 1;
        if (b.rewardAmount == null) return -1;
        return b.rewardAmount - a.rewardAmount;
      });
    }
    return sorted;
  }, [items, sortKey, stationFilter]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.center}>
        <Text>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <View style={styles.sortRow}>
          <SortButton
            label="現在地から近い順"
            active={sortKey === 'distance'}
            onPress={() => setSortKey('distance')}
          />
          <SortButton
            label="懸賞金が高い順"
            active={sortKey === 'reward'}
            onPress={() => setSortKey('reward')}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {stationOptions.map((station) => (
            <TouchableOpacity
              key={station}
              style={[styles.chip, stationFilter === station && styles.chipActive]}
              onPress={() => setStationFilter(station)}>
              <Text style={[styles.chipText, stationFilter === station && styles.chipTextActive]}>
                {station}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={displayedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <WantedCard
            item={item}
            isFavorite={isFavorite(item.id)}
            onToggleFavorite={() => toggleFavorite(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text>該当する指名手配情報がありません。</Text>
          </View>
        }
      />
    </View>
  );
}

function SortButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.sortButton, active && styles.sortButtonActive]} onPress={onPress}>
      <Text style={[styles.sortButtonText, active && styles.sortButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  toolbar: { paddingTop: 8, backgroundColor: '#f5f5f5' },
  sortRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  sortButtonActive: { backgroundColor: '#c0392b' },
  sortButtonText: { fontSize: 12, color: '#333' },
  sortButtonTextActive: { color: '#fff', fontWeight: '600' },
  filterRow: { paddingHorizontal: 12, marginBottom: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#333', borderColor: '#333' },
  chipText: { fontSize: 12, color: '#333' },
  chipTextActive: { color: '#fff' },
  list: { padding: 12 },
});
