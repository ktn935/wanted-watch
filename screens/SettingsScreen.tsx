// 設定タブの画面。今後、通知設定などの項目をここに追加していく想定。
// 「このアプリについて」(出典表記を含む)は画面下部に固定表示する。

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/Colors';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.settingsList}>
        <Text style={styles.placeholder}>他の設定項目は今後追加予定です。</Text>
      </ScrollView>

      <View style={styles.aboutSection}>
        <Text style={styles.aboutTitle}>このアプリについて</Text>
        <Text style={styles.aboutBody}>
          警視庁が公開する指名手配情報を、現在地から近い順に表示するアプリです。
        </Text>
        <Text style={styles.aboutBody}>
          表示データは1日1回、警視庁の指名手配ページから取得しています。
        </Text>
        <Text style={styles.source}>
          出典:警視庁ホームページ(https://www.keishicho.metro.tokyo.lg.jp/)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', backgroundColor: theme.background },
  settingsList: { padding: 16 },
  placeholder: { fontSize: 14, color: theme.textMuted },
  aboutSection: {
    padding: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  aboutTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: theme.text },
  aboutBody: { fontSize: 13, marginBottom: 8, color: theme.textMuted },
  source: { fontSize: 12, color: theme.textMuted, marginTop: 4 },
});
