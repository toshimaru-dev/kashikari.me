import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { SubHeader } from '@/components/Header';
import { ColorPalette, fonts, radius, spacing, themes, ThemeId } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

/** テーマ選択カードの表示定義（順序は spec の通り） */
const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: 'green', label: 'グリーン' },
  { id: 'blue', label: 'ブルー' },
  { id: 'light', label: 'ライト' },
  { id: 'dark', label: 'ダーク' },
  { id: 'coral', label: 'コーラル（デフォルト）' },
];

/** アプリ情報・お問い合わせの定数 */
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const TERMS_URL = 'https://frisk1995.github.io/kashikari-me-beta/terms-of-use.html';
const PRIVACY_URL = 'https://frisk1995.github.io/kashikari-me-beta/privacy-policy.html';
const CONTACT_EMAIL = 'kashikari.me.26@gmail.com';
const CONTACT_SUBJECT = '[Kashikari.me] お問い合わせ';

/** in-app ブラウザで URL を開く */
const openUrl = async (url: string) => {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  } catch {
    // ブラウザが開けない場合は OS のデフォルト遷移にフォールバック
    Linking.openURL(url).catch(() => {});
  }
};

/** メールアプリを起動する */
const openMail = () => {
  const subject = encodeURIComponent(CONTACT_SUBJECT);
  Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${subject}`).catch(() => {});
};

export default function SettingsScreen() {
  const { colors, themeId, shadows, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.screen}>
      <SubHeader title="設定" onBack={() => router.back()} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>テーマカラー</Text>
        <Text style={styles.sectionSub}>アプリ全体の配色を選べます</Text>

        {THEME_OPTIONS.map((opt) => {
          const palette = themes[opt.id];
          const selected = opt.id === themeId;
          // 各テーマの代表3色（iconTile）をサークルで表示
          const circles = palette.iconTile.slice(0, 3);
          return (
            <Pressable
              key={opt.id}
              onPress={() => setTheme(opt.id)}
              style={({ pressed }) => [
                styles.card,
                shadows.card,
                selected ? styles.cardSelected : null,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`テーマ ${opt.label}`}
            >
              {/* テーマ代表色のプレビュー（ヘッダー背景の四角 + 3色サークル） */}
              <View style={[styles.preview, { backgroundColor: palette.headerBg }]}>
                <View style={styles.previewCircles}>
                  {circles.map((color, i) => (
                    <View
                      key={i}
                      style={[
                        styles.previewCircle,
                        { backgroundColor: color, marginLeft: i > 0 ? -6 : 0 },
                      ]}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardLabel} numberOfLines={1}>
                  {opt.label}
                </Text>
                <View style={styles.swatches}>
                  {circles.map((color, i) => (
                    <View key={i} style={[styles.swatch, { backgroundColor: color }]} />
                  ))}
                </View>
              </View>

              <View
                style={[
                  styles.check,
                  selected ? styles.checkOn : styles.checkOff,
                ]}
              >
                {selected ? (
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                ) : null}
              </View>
            </Pressable>
          );
        })}

        {/* アプリ情報 */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>アプリ情報</Text>

        {/* バージョン（矢印なし・右にバージョンテキスト） */}
        <View style={[styles.row, shadows.card]}>
          <View style={styles.rowIcon}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.rowLabel}>バージョン</Text>
          <Text style={styles.rowValue}>{APP_VERSION}</Text>
        </View>

        {/* 利用規約 */}
        <Pressable
          onPress={() => openUrl(TERMS_URL)}
          style={({ pressed }) => [styles.row, shadows.card, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="利用規約を開く"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.rowLabel}>利用規約</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSub} />
        </Pressable>

        {/* プライバシーポリシー */}
        <Pressable
          onPress={() => openUrl(PRIVACY_URL)}
          style={({ pressed }) => [styles.row, shadows.card, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="プライバシーポリシーを開く"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.rowLabel}>プライバシーポリシー</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSub} />
        </Pressable>

        {/* フィードバック */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>フィードバック</Text>

        {/* お問い合わせ */}
        <Pressable
          onPress={openMail}
          style={({ pressed }) => [styles.row, shadows.card, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="お問い合わせメールを作成する"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.rowLabel}>お問い合わせ</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSub} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    flex: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.screenH,
      paddingTop: spacing.xl,
      paddingBottom: spacing.scrollBottom,
    },
    sectionLabel: {
      fontFamily: fonts.jp800,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 18,
      color: c.text,
      marginBottom: 4,
    },
    sectionSub: {
      fontFamily: fonts.jp500,
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 16,
      color: c.textSub,
      marginBottom: spacing.lg,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: c.surface,
      borderRadius: radius.card,
      padding: spacing.cardPad,
      marginBottom: spacing.cardGap,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    cardSelected: {
      borderColor: c.primary,
    },
    preview: {
      width: 56,
      height: 56,
      borderRadius: radius.iconTile,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewCircles: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    previewCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.85)',
    },
    cardBody: {
      flex: 1,
    },
    cardLabel: {
      fontFamily: fonts.jp700,
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
      marginBottom: 8,
    },
    swatches: {
      flexDirection: 'row',
      gap: 6,
    },
    swatch: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: c.border,
    },
    check: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: {
      backgroundColor: c.primary,
    },
    checkOff: {
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: 'transparent',
    },
    sectionLabelSpaced: {
      marginTop: spacing['2xl'],
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      backgroundColor: c.surface,
      borderRadius: radius.card,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    rowIcon: {
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    rowLabel: {
      flex: 1,
      fontFamily: fonts.jp700,
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    rowValue: {
      fontFamily: fonts.jp500,
      fontSize: 14,
      fontWeight: '500',
      color: c.textSub,
    },
  });
}
