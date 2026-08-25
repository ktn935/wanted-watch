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
import { theme } from '../constants/Colors';
import { regionFromSourceName } from '../lib/regions';

type SortKey = 'distance' | 'reward';
const ALL_REGIONS = 'すべて';
const ALL_STATIONS = 'すべて';

export default function WantedListScreen() {
  const [items, setItems] = useState<WantedSuspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [regionFilter, setRegionFilter] = useState<string>(ALL_REGIONS);
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

  const regionOptions = useMemo(() => {
    const names = items
      .map((item) => regionFromSourceName(item.sourceName))
      .filter((name): name is string => Boolean(name));
    return [ALL_REGIONS, ...Array.from(new Set(names))];
  }, [items]);

  const itemsInRegion = useMemo(() => {
    return regionFilter === ALL_REGIONS
      ? items
      : items.filter((item) => regionFromSourceName(item.sourceName) === regionFilter);
  }, [items, regionFilter]);

  const stationOptions = useMemo(() => {
    const names = itemsInRegion
      .map((item) => item.stationName)
      .filter((name): name is string => Boolean(name));
    return [ALL_STATIONS, ...Array.from(new Set(names))];
  }, [itemsInRegion]);

  // 地方フィルターを変えたら、絞り込み対象外になった警察署の選択は解除する
  useEffect(() => {
    if (stationFilter !== ALL_STATIONS && !stationOptions.includes(stationFilter)) {
      setStationFilter(ALL_STATIONS);
    }
  }, [stationOptions, stationFilter]);

  const displayedItems = useMemo(() => {
    const filtered =
      stationFilter === ALL_STATIONS
        ? itemsInRegion
        : itemsInRegion.filter((item) => item.stationName === stationFilter);

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
  }, [itemsInRegion, sortKey, stationFilter]);

  if (loading) {
    return (
      <View style={[styles.center, styles.screen]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={[styles.center, styles.screen]}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
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
        {regionOptions.length > 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {regionOptions.map((region) => (
              <TouchableOpacity
                key={region}
                style={[styles.chip, regionFilter === region && styles.chipActive]}
                onPress={() => setRegionFilter(region)}>
                <Text style={[styles.chipText, regionFilter === region && styles.chipTextActive]}>
                  {region}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
            <Text style={styles.emptyText}>該当する指名手配情報がありません。</Text>
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
  screen: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: theme.text },
  emptyText: { color: theme.textMuted },
  toolbar: {
    paddingTop: 8,
    backgroundColor: theme.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  sortRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    marginRight: 8,
  },
  sortButtonActive: { backgroundColor: theme.danger, borderColor: theme.danger },
  sortButtonText: { fontSize: 12, color: theme.textMuted },
  sortButtonTextActive: { color: theme.text, fontWeight: '600' },
  filterRow: { paddingHorizontal: 12, marginBottom: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { fontSize: 12, color: theme.textMuted },
  chipTextActive: { color: '#000', fontWeight: '600' },
  list: { padding: 12, backgroundColor: theme.background },
});
