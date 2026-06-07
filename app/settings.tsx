import React, { useMemo, useState } from 'react';
import { Alert, Clipboard, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { SubHeader } from '@/components/Header';
import { ColorPalette, fonts, radius, spacing, themes, type ThemeId } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { usePurchase } from '@/context/PurchaseContext';

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
const TERMS_URL = 'https://toshimaru-dev.github.io/kashikari.me/terms-of-use.html';
const PRIVACY_URL = 'https://toshimaru-dev.github.io/kashikari.me/privacy-policy.html';
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
  const { colors, themeId, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { userId, username, setUsername } = useUser();
  const { isPremium } = usePurchase();
  const [copied, setCopied] = useState(false);

  const copyUserId = () => {
    if (!userId) return;
    Clipboard.setString(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.screen}>
      <SubHeader title="設定" onBack={() => router.back()} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ユーザー情報 */}
        <Text style={styles.sectionLabel}>ユーザー情報</Text>

        {/* ユーザー名 */}
        <View style={[styles.row, shadows.card]}>
          <View style={styles.rowIcon}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>ユーザー名</Text>
            <Text style={styles.rowValueSub} numberOfLines={1}>{username ?? '—'}</Text>
          </View>
          <Pressable
            onPress={() => Alert.prompt(
              'ユーザー名を変更',
              '新しいユーザー名（20文字以内）',
              async (newName) => {
                const trimmed = (newName ?? '').trim();
                if (!trimmed || trimmed.length > 20) return;
                try { await setUsername(trimmed); } catch {}
              },
              'plain-text',
              username ?? '',
            )}
            hitSlop={8}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.textSub} />
          </Pressable>
        </View>

        {/* UUID */}
        <Pressable
          onPress={copyUserId}
          style={({ pressed }) => [styles.row, shadows.card, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityLabel="ユーザーIDをコピー"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="key-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>ユーザーID</Text>
            <Text style={styles.rowValueSub} numberOfLines={1}>
              {userId ? userId : '—'}
            </Text>
          </View>
          <Ionicons
            name={copied ? 'checkmark-outline' : 'copy-outline'}
            size={18}
            color={copied ? colors.success : colors.textSub}
          />
        </Pressable>

        {/* テーマカラー */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>テーマカラー</Text>
        <Pressable
          onPress={() => router.push('/theme-select')}
          style={({ pressed }) => [styles.row, shadows.card, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="テーマカラーを変更"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowBody}>
            <View style={styles.themeRowTitle}>
              <Text style={styles.rowLabel}>テーマカラー</Text>
              {!isPremium && (
                <View style={[styles.premiumBadge, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="star" size={10} color={colors.primary} />
                  <Text style={[styles.premiumBadgeText, { color: colors.primary }]}>プレミアム</Text>
                </View>
              )}
            </View>
            <View style={styles.themePreviewRow}>
              {themes[themeId].iconTile.map((c, i) => (
                <View key={i} style={[styles.themeDot, { backgroundColor: c }]} />
              ))}
              <Text style={styles.rowValueSub}>
                {THEME_OPTIONS.find((t) => t.id === themeId)?.label ?? themeId}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSub} />
        </Pressable>

        {/* プラン */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>プラン</Text>
        <Pressable
          onPress={() => router.push('/paywall')}
          style={({ pressed }) => [styles.row, shadows.card, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="star-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>
              {isPremium ? 'プレミアムプラン' : 'フリープラン'}
            </Text>
            <Text style={styles.rowValueSub}>
              {isPremium ? 'すべての機能が利用可能' : 'アップグレードで制限を解除'}
            </Text>
          </View>
          {isPremium ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.textSub} />
          )}
        </Pressable>

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
    themeRowTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 99,
    },
    premiumBadgeText: {
      fontFamily: fonts.jp700,
      fontSize: 10,
      fontWeight: '700',
    },
    themePreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    themeDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    sectionLabelSpaced: {
      marginTop: spacing['2xl'],
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      backgroundColor: c.surface,
      borderRadius: radius.card,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      marginBottom: spacing.sm,
    },
    rowIcon: {
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    rowBody: {
      flex: 1,
      justifyContent: 'center',
    },
    rowLabel: {
      fontFamily: fonts.jp700,
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    rowValueSub: {
      fontFamily: fonts.jp500,
      fontSize: 11,
      color: c.textSub,
      marginTop: 2,
    },
    rowValue: {
      fontFamily: fonts.jp500,
      fontSize: 14,
      fontWeight: '500',
      color: c.textSub,
    },
  });
}
