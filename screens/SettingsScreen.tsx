// 設定タブの画面。
// 「このアプリについて」(出典表記を含む)は画面下部に固定表示する。

import { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '../constants/Colors';
import { isExtensionStorageLinked, readWidgetFavoritesRaw } from '../lib/widgetDiagnostics';
import { useFavorites } from '../lib/FavoritesContext';
import { enableNearbyNotifications, disableNearbyNotifications } from '../lib/pushNotifications';

const NEARBY_NOTIFICATIONS_ENABLED_KEY = 'wantedWatch:nearbyNotificationsEnabled';
const NEARBY_NOTIFICATIONS_TOKEN_KEY = 'wantedWatch:nearbyNotificationsToken';

const PRIVACY_POLICY_URL = 'https://ktn935.github.io/wanted-watch/privacy-policy.html';
const TERMS_URL = 'https://ktn935.github.io/wanted-watch/terms-of-service.html';
const SUPPORT_URL = 'https://ktn935.github.io/wanted-watch/support.html';

export default function SettingsScreen() {
  const [diagnostics, setDiagnostics] = useState<{ linked: boolean; raw: string | null } | null>(
    null
  );
  const { liveActivityEnabled, setLiveActivityEnabled } = useFavorites();
  const [nearbyNotificationsEnabled, setNearbyNotificationsEnabledState] = useState(false);
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(NEARBY_NOTIFICATIONS_ENABLED_KEY).then((value) => {
      setNearbyNotificationsEnabledState(value === 'true');
    });
  }, []);

  const handleToggleNearbyNotifications = async (next: boolean) => {
    setNotificationsBusy(true);
    setNotificationsError(null);
    try {
      if (next) {
        const token = await enableNearbyNotifications();
        if (!token) {
          setNotificationsError('通知の許可が必要です。設定アプリから許可してください。');
          return;
        }
        await AsyncStorage.setItem(NEARBY_NOTIFICATIONS_TOKEN_KEY, token);
        await AsyncStorage.setItem(NEARBY_NOTIFICATIONS_ENABLED_KEY, 'true');
        setNearbyNotificationsEnabledState(true);
      } else {
        const token = await AsyncStorage.getItem(NEARBY_NOTIFICATIONS_TOKEN_KEY);
        if (token) {
          await disableNearbyNotifications(token);
        }
        await AsyncStorage.setItem(NEARBY_NOTIFICATIONS_ENABLED_KEY, 'false');
        setNearbyNotificationsEnabledState(false);
      }
    } catch (e) {
      setNotificationsError('設定の変更に失敗しました: ' + (e as Error).message);
    } finally {
      setNotificationsBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.settingsList}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>近くの新着指名手配を通知(半径20km)</Text>
          <Switch
            value={nearbyNotificationsEnabled}
            onValueChange={handleToggleNearbyNotifications}
            disabled={notificationsBusy}
            trackColor={{ false: theme.border, true: theme.accent }}
          />
        </View>
        {notificationsError && <Text style={styles.errorInline}>{notificationsError}</Text>}

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

        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          <Text style={styles.linkText}>プライバシーポリシー</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(TERMS_URL)}>
          <Text style={styles.linkText}>利用規約</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(SUPPORT_URL)}>
          <Text style={styles.linkText}>サポート・お問い合わせ</Text>
        </TouchableOpacity>

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
  errorInline: { fontSize: 12, color: theme.danger, paddingBottom: 8 },
  linkRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  linkText: { fontSize: 14, color: theme.accent },
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
