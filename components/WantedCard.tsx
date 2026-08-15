import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { WantedListItem } from '@/lib/types';
import { theme } from '@/constants/Colors';

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
    <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(item.sourceUrl)}>
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <FontAwesome name="user" size={24} color={theme.textMuted} />
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
              size={18}
              color={isFavorite ? theme.danger : theme.textMuted}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.link}>{item.title ?? '不明'}</Text>
        {item.distanceKm != null && (
          <Text style={styles.distance}>現在地から約{item.distanceKm.toFixed(1)}km</Text>
        )}
        <Text style={styles.detail}>
          発生場所: <Text style={styles.link}>{item.occurrencePlace ?? '不明'}</Text>
        </Text>
        <Text style={styles.detail}>特徴: {item.characteristics ?? '不明'}</Text>
        <Text style={styles.detail}>
          管轄: <Text style={styles.link}>{item.stationName ?? '不明'}</Text>
        </Text>
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
  row: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    marginBottom: 10,
  },
  photo: { width: 84, height: 84 },
  photoPlaceholder: { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, padding: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', color: theme.text, flexShrink: 1, marginRight: 8 },
  link: { color: theme.accent },
  detail: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
  distance: { fontSize: 12, color: theme.danger, marginTop: 3, fontWeight: '600' },
  reward: { fontSize: 12, color: theme.danger, marginTop: 4, fontWeight: '700' },
  source: { fontSize: 10, color: theme.textMuted, marginTop: 6 },
});
