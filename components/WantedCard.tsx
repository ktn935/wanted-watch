import React, { useState } from 'react';
import { Image, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);

  return (
    <View style={styles.row}>
      {/* 顔写真部分のみタップで拡大する */}
      <TouchableOpacity
        disabled={!item.photoUrl}
        onPress={() => setIsPhotoZoomed(true)}
        activeOpacity={item.photoUrl ? 0.85 : 1}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <FontAwesome name="user" size={24} color={theme.textMuted} />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.name} selectable>
            {item.suspectName ?? '不明'}
          </Text>
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
        <Text style={styles.link} selectable>
          {item.title ?? '不明'}
        </Text>
        {item.distanceKm != null && (
          <Text style={styles.distance} selectable>
            現在地から約{item.distanceKm.toFixed(1)}km
          </Text>
        )}
        <Text style={styles.detail} selectable>
          発生場所: <Text style={styles.link}>{item.occurrencePlace ?? '不明'}</Text>
        </Text>
        <Text style={styles.detail} selectable>
          特徴: {item.characteristics ?? '不明'}
        </Text>
        <Text style={styles.detail} selectable>
          管轄: <Text style={styles.link}>{item.stationName ?? '不明'}</Text>
        </Text>

        {item.phone ? (
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)}>
            <Text style={[styles.detail, styles.phoneLink]} selectable>
              電話: {item.phone}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.detail} selectable>
            電話: 不明
          </Text>
        )}

        <Text style={styles.reward} selectable>
          懸賞金: {item.rewardAmount != null ? `${item.rewardAmount.toLocaleString()}円` : '不明'}
        </Text>

        {/* 政府標準利用規約に基づく出典表記。削除しないこと。タップすると出典元を開く */}
        <TouchableOpacity onPress={() => Linking.openURL(item.sourceUrl)}>
          <Text style={[styles.source, styles.sourceLink]} selectable>
            {item.sourceLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {item.photoUrl && (
        <Modal
          visible={isPhotoZoomed}
          transparent
          animationType="fade"
          onRequestClose={() => setIsPhotoZoomed(false)}>
          <TouchableOpacity
            style={styles.zoomBackdrop}
            activeOpacity={1}
            onPress={() => setIsPhotoZoomed(false)}>
            <Image source={{ uri: item.photoUrl }} style={styles.zoomImage} resizeMode="contain" />
          </TouchableOpacity>
        </Modal>
      )}
    </View>
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
  phoneLink: { textDecorationLine: 'underline' },
  distance: { fontSize: 12, color: theme.danger, marginTop: 3, fontWeight: '600' },
  reward: { fontSize: 12, color: theme.danger, marginTop: 4, fontWeight: '700' },
  source: { fontSize: 10, color: theme.textMuted, marginTop: 6 },
  sourceLink: { textDecorationLine: 'underline' },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: { width: '92%', height: '80%' },
});
