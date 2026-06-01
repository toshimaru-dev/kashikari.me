import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { ColorPalette, fonts, isLightColor, radius } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  /** 先頭にプラスアイコンを付ける（FAB 等） */
  withPlus?: boolean;
  style?: ViewStyle;
}

/** プライマリボタン（保存・FAB 共通）。グラデーションはテーマ追従。 */
export function PrimaryButton({ label, onPress, withPlus = false, style }: PrimaryButtonProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // ボタン背景が明るい場合（ダークテーマの白ボタン等）はテキストを暗色にする
  const labelColor = isLightColor(colors.fabBg) ? '#111111' : colors.white;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.button, shadows.fab]}>
        {withPlus ? (
          <Ionicons name="add" size={22} color={labelColor} style={styles.plus} />
        ) : null}
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** キャンセル等のセカンダリボタン */
export function SecondaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.7 : 1 }, style]}
      accessibilityRole="button"
    >
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

/** 削除等の危険ボタン */
export function DangerButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.danger, { opacity: pressed ? 0.7 : 1 }, style]}
      accessibilityRole="button"
    >
      <View style={styles.dangerInner}>
        <Ionicons name="trash-outline" size={18} color={colors.error} />
        <Text style={styles.dangerLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    button: {
      height: 56,
      borderRadius: radius.button,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.fabBg,
    },
    plus: {
      marginRight: 8,
    },
    label: {
      fontFamily: fonts.baloo800,
      fontSize: 16,
      fontWeight: '800',
      lineHeight: 20,
      color: c.white,
    },
    secondary: {
      height: 52,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    secondaryLabel: {
      fontFamily: fonts.jp700,
      fontSize: 16,
      fontWeight: '700',
      color: c.textSub,
    },
    danger: {
      height: 52,
      borderRadius: 18,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dangerLabel: {
      fontFamily: fonts.jp700,
      fontSize: 16,
      fontWeight: '700',
      color: c.error,
    },
  });
}
