import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useFavorites } from '../lib/FavoritesContext';
import WantedCard from '../components/WantedCard';
import { theme } from '../constants/Colors';

export default function FavoritesScreen() {
  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  return (
    <FlatList
      data={favorites}
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
          <Text style={styles.emptyText}>お気に入りに登録した指名手配情報がここに表示されます。</Text>
        </View>
      }
      style={styles.screen}
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.background },
  list: { padding: 12, flexGrow: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: theme.textMuted },
});
