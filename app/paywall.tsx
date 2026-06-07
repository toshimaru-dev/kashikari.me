import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, SecondaryButton } from '@/components/PrimaryButton';
import { usePurchase, FREE_GROUP_LIMIT, FREE_MEMBER_LIMIT } from '@/context/PurchaseContext';
import { ColorPalette, fonts, radius, spacing } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

const PRICE_LABEL = '¥300 / 月';

const FEATURES: { icon: string; free: string; premium: string }[] = [
  { icon: 'albums-outline', free: `グループ ${FREE_GROUP_LIMIT}個まで`, premium: 'グループ無制限' },
  { icon: 'people-outline', free: `メンバー ${FREE_MEMBER_LIMIT}人まで`, premium: 'メンバー無制限' },
  { icon: 'color-palette-outline', free: 'コーラルのみ', premium: 'テーマカラー全10色' },
  { icon: 'download-outline', free: '—', premium: 'CSVエクスポート' },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { purchasePremium, restorePurchases, _devTogglePremium, isPremium } = usePurchase();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      await purchasePremium();
      router.back();
    } catch (e) {
      console.warn('[paywall] purchasePremium failed', e);
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      router.back();
    } catch (e) {
      console.warn('[paywall] restorePurchases failed', e);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 16 }]}>
      {/* 閉じるボタン */}
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
        accessibilityLabel="閉じる"
      >
        <Ionicons name="close" size={24} color={colors.textSub} />
      </Pressable>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー */}
        <View style={styles.heroWrap}>
          <View style={[styles.crownBg, { backgroundColor: colors.primary + '22' }]}>
            <Ionicons name="star" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>プレミアムプラン</Text>
          <Text style={[styles.subtitle, { color: colors.textSub }]}>
            制限なしで立て替えをもっと快適に
          </Text>
        </View>

        {/* 機能リスト */}
        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name={f.icon as any} size={22} color={colors.primary} />
              </View>
              <View style={styles.featureBody}>
                <Text style={[styles.featurePremium, { color: colors.text }]}>{f.premium}</Text>
                <Text style={[styles.featureFree, { color: colors.textSub }]}>
                  無料版: {f.free}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            </View>
          ))}
        </View>

        {/* 価格 */}
        <Text style={[styles.price, { color: colors.text }]}>{PRICE_LABEL}</Text>
        <Text style={[styles.priceNote, { color: colors.textSub }]}>
          いつでもキャンセル可能
        </Text>
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        {isPremium ? (
          <View style={[styles.alreadyPremium, { backgroundColor: colors.surface }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={[styles.alreadyPremiumText, { color: colors.primary }]}>
              プレミアムプランご利用中
            </Text>
          </View>
        ) : (
          <PrimaryButton
            label={purchasing ? '処理中...' : `${PRICE_LABEL}で始める`}
            onPress={handlePurchase}
          />
        )}

        <Pressable
          onPress={handleRestore}
          disabled={restoring}
          style={({ pressed }) => [styles.restoreBtn, { opacity: pressed || restoring ? 0.6 : 1 }]}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.textSub} />
          ) : (
            <Text style={[styles.restoreText, { color: colors.textSub }]}>購入を復元する</Text>
          )}
        </Pressable>

        {/* 開発用トグル */}
        {__DEV__ && (
          <Pressable
            onPress={async () => { await _devTogglePremium(); router.back(); }}
            style={({ pressed }) => [styles.devBtn, { opacity: pressed ? 0.7 : 1, borderColor: colors.border }]}
          >
            <Text style={[styles.devBtnText, { color: colors.textSub }]}>
              （開発）プレミアムを {isPremium ? 'OFF' : 'ON'} にする
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    closeBtn: {
      position: 'absolute',
      top: 16,
      right: spacing.screenH,
      zIndex: 10,
      padding: 4,
    },
    content: {
      paddingHorizontal: spacing.screenH,
      paddingTop: 56,
      paddingBottom: 24,
      alignItems: 'center',
    },
    heroWrap: { alignItems: 'center', marginBottom: spacing['2xl'] },
    crownBg: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontFamily: fonts.jp800,
      fontSize: 24,
      fontWeight: '800',
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      fontFamily: fonts.jp500,
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
    },
    featureList: { width: '100%', gap: spacing.sm, marginBottom: spacing['2xl'] },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.card,
      padding: spacing.lg,
      gap: spacing.md,
    },
    featureIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureBody: { flex: 1 },
    featurePremium: { fontFamily: fonts.jp700, fontSize: 15, fontWeight: '700' },
    featureFree: { fontFamily: fonts.jp500, fontSize: 12, marginTop: 2 },
    price: {
      fontFamily: fonts.jp800,
      fontSize: 32,
      fontWeight: '800',
      textAlign: 'center',
    },
    priceNote: {
      fontFamily: fonts.jp500,
      fontSize: 12,
      marginTop: 4,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    cta: {
      paddingHorizontal: spacing.screenH,
      gap: spacing.sm,
    },
    alreadyPremium: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: 56,
      borderRadius: radius.button,
    },
    alreadyPremiumText: {
      fontFamily: fonts.jp700,
      fontSize: 15,
      fontWeight: '700',
    },
    restoreBtn: {
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    restoreText: {
      fontFamily: fonts.jp500,
      fontSize: 13,
      textDecorationLine: 'underline',
    },
    devBtn: {
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 12,
      borderStyle: 'dashed',
    },
    devBtnText: { fontFamily: fonts.jp500, fontSize: 13 },
  });
}
