import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SubHeader } from '@/components/Header';
import { ColorPalette, DEFAULT_THEME_ID, fonts, radius, spacing, themes, type ThemeId } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { usePurchase } from '@/context/PurchaseContext';

const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: 'coral',    label: 'コーラル' },
  { id: 'green',    label: 'グリーン' },
  { id: 'blue',     label: 'ブルー' },
  { id: 'purple',   label: 'パープル' },
  { id: 'pink',     label: 'ピンク' },
  { id: 'orange',   label: 'オレンジ' },
  { id: 'teal',     label: 'ティール' },
  { id: 'midnight', label: 'ミッドナイト' },
  { id: 'dark',     label: 'ダーク' },
  { id: 'light',    label: 'ライト' },
];

export default function ThemeSelectScreen() {
  const insets = useSafeAreaInsets();
  const { colors, themeId, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isPremium } = usePurchase();

  const handleSelect = (id: ThemeId) => {
    const isFree = id === DEFAULT_THEME_ID;
    if (!isPremium && !isFree) {
      router.push('/paywall');
      return;
    }
    setTheme(id);
  };

  return (
    <View style={styles.screen}>
      <SubHeader title="テーマカラー" onBack={() => router.back()} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.hint, { color: colors.textSub }]}>
          {isPremium ? 'アプリ全体の配色を選択してください' : 'コーラルは無料。他のテーマはプレミアムプランで利用できます'}
        </Text>

        <View style={styles.grid}>
          {THEME_OPTIONS.map((opt) => {
            const palette = themes[opt.id];
            const selected = opt.id === themeId;
            const locked = !isPremium && opt.id !== DEFAULT_THEME_ID;
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleSelect(opt.id)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
                  selected && { borderColor: colors.primary, borderWidth: 2.5 },
                  locked && { opacity: 0.6 },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`テーマ ${opt.label}${locked ? '（プレミアム）' : ''}`}
              >
                {/* プレビュー */}
                <View style={[styles.preview, { backgroundColor: palette.headerBg }]}>
                  <View style={styles.previewDots}>
                    {palette.iconTile.map((c, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          { backgroundColor: c, marginLeft: i > 0 ? -5 : 0 },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={[styles.miniCard, { backgroundColor: palette.surface + 'CC' }]} />
                  {/* 鍵アイコン */}
                  {locked && (
                    <View style={styles.lockBadge}>
                      <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>

                {/* ラベル + チェック / 鍵 */}
                <View style={styles.cardFooter}>
                  <Text
                    style={[
                      styles.cardLabel,
                      { color: selected ? colors.primary : colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selected && !locked && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                  {locked && (
                    <Ionicons name="lock-closed-outline" size={16} color={colors.textSub} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: spacing.screenH,
      paddingTop: spacing.lg,
    },
    hint: {
      fontFamily: fonts.jp500,
      fontSize: 13,
      marginBottom: spacing.xl,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    card: {
      width: '47%',
      borderRadius: radius.card,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    preview: {
      height: 90,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    previewDots: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.7)',
    },
    miniCard: {
      width: 60,
      height: 12,
      borderRadius: 6,
    },
    lockBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: 'transparent',
    },
    cardLabel: {
      fontFamily: fonts.jp700,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
