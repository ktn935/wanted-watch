import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { WantedListItem } from '@/lib/types';

export default function WantedCard({
  item,
  isFavorite,
  onToggleFavorite,
}: {
  item: WantedListItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => Linking.openURL(item.sourceUrl)}>
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <FontAwesome name="user" size={28} color="#bbb" />
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{item.suspectName ?? '不明'}</Text>
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={onToggleFavorite}>
            <FontAwesome
              name={isFavorite ? 'heart' : 'heart-o'}
              size={20}
              color={isFavorite ? '#c0392b' : '#999'}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.detail}>{item.title ?? '不明'}</Text>
        {item.distanceKm != null && (
          <Text style={styles.distance}>現在地から約{item.distanceKm.toFixed(1)}km</Text>
        )}
        <Text style={styles.detail}>発生場所: {item.occurrencePlace ?? '不明'}</Text>
        <Text style={styles.detail}>特徴: {item.characteristics ?? '不明'}</Text>
        <Text style={styles.detail}>管轄: {item.stationName ?? '不明'}</Text>
        <Text style={styles.detail}>電話: {item.phone ?? '不明'}</Text>
        <Text style={styles.reward}>
          懸賞金: {item.rewardAmount != null ? `${item.rewardAmount.toLocaleString()}円` : '不明'}
        </Text>
        {/* 政府標準利用規約に基づく出典表記。削除しないこと */}
        <Text style={styles.source}>{item.sourceLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  photo: { width: 90, height: 90 },
  photoPlaceholder: { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, padding: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', flexShrink: 1, marginRight: 8 },
  detail: { fontSize: 12, color: '#333', marginTop: 2 },
  distance: { fontSize: 12, color: '#c0392b', marginTop: 2, fontWeight: '600' },
  reward: { fontSize: 12, color: '#b8860b', marginTop: 2, fontWeight: '600' },
  source: { fontSize: 10, color: '#999', marginTop: 4 },
});
