// 設定タブの画面。今後、通知設定などの項目をここに追加していく想定。
// 「このアプリについて」(出典表記を含む)は画面下部に固定表示する。

import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../constants/Colors';
import { isExtensionStorageLinked, readWidgetFavoritesRaw } from '../lib/widgetDiagnostics';
import { useFavorites } from '../lib/FavoritesContext';

export default function SettingsScreen() {
  const [diagnostics, setDiagnostics] = useState<{ linked: boolean; raw: string | null } | null>(
    null
  );
  const { liveActivityEnabled, setLiveActivityEnabled } = useFavorites();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.settingsList}>
        {Platform.OS === 'ios' && (
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>
              ロック画面・Dynamic IslandへのLive Activity表示
            </Text>
            <Switch
              value={liveActivityEnabled}
              onValueChange={setLiveActivityEnabled}
              trackColor={{ false: theme.border, true: theme.accent }}
            />
          </View>
        )}

        {Platform.OS === 'ios' && (
          <View style={styles.diagnosticsBox}>
            <Text style={styles.diagnosticsTitle}>ウィジェット連携の診断(デバッグ用)</Text>
            <TouchableOpacity
              style={styles.diagnosticsButton}
              onPress={() =>
                setDiagnostics({
                  linked: isExtensionStorageLinked(),
                  raw: readWidgetFavoritesRaw(),
                })
              }>
              <Text style={styles.diagnosticsButtonText}>状態を確認</Text>
            </TouchableOpacity>
            {diagnostics && (
              <View style={styles.diagnosticsResult}>
                <Text style={styles.diagnosticsText}>
                  ネイティブモジュール: {diagnostics.linked ? 'リンク済み' : '未リンク(スタブ)'}
                </Text>
                <Text style={styles.diagnosticsText}>
                  保存されているお気に入り(生データ): {diagnostics.raw ?? '(なし)'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.aboutSection}>
        <Text style={styles.aboutTitle}>このアプリについて</Text>
        <Text style={styles.aboutBody}>
          全国の警察が公開する指名手配情報を、現在地から近い順に表示するアプリです。
        </Text>
        <Text style={styles.aboutBody}>表示データは毎週月曜朝に自動更新しています。</Text>
        <Text style={styles.source}>
          出典:各都道府県警察・警視庁・警察庁の公式ホームページ
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', backgroundColor: theme.background },
  settingsList: { padding: 16 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  settingLabel: { fontSize: 14, color: theme.text, flex: 1, marginRight: 12 },
  diagnosticsBox: {
    marginTop: 24,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: 8,
  },
  diagnosticsTitle: { fontSize: 13, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
  diagnosticsButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.accent,
    borderRadius: 6,
  },
  diagnosticsButtonText: { fontSize: 12, color: '#000', fontWeight: '600' },
  diagnosticsResult: { marginTop: 10 },
  diagnosticsText: { fontSize: 11, color: theme.textMuted, marginTop: 4 },
  aboutSection: {
    padding: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  aboutTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: theme.text },
  aboutBody: { fontSize: 13, marginBottom: 8, color: theme.textMuted },
  source: { fontSize: 12, color: theme.textMuted, marginTop: 4 },
});
