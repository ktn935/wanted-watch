// アプリ全体のデザイン: 純黒背景 + オレンジ〜アンバーのリンク + 赤の警告アクセント。
// システムのライト/ダーク設定に関わらず、常にこの1つの見た目に統一する
// (light/darkの中身をあえて同じにしている)。

export const theme = {
  background: '#000000',
  surface: '#0a0a0a',
  border: '#333333',
  text: '#ffffff',
  textMuted: '#999999',
  accent: '#ff8c00', // 事件名・警察署名などのテキストリンク
  danger: '#d7263d', // 懸賞金・緊急度の高い情報の強調
};

const tintColor = theme.accent;

export default {
  light: {
    text: theme.text,
    background: theme.background,
    tint: tintColor,
    tabIconDefault: theme.textMuted,
    tabIconSelected: tintColor,
  },
  dark: {
    text: theme.text,
    background: theme.background,
    tint: tintColor,
    tabIconDefault: theme.textMuted,
    tabIconSelected: tintColor,
  },
};
