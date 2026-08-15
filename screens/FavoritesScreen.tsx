import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useFavorites } from '../lib/FavoritesContext';
import WantedCard from '../components/WantedCard';

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
          <Text>お気に入りに登録した指名手配情報がここに表示されます。</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});
