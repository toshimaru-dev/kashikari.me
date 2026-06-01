import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, radius, tileColorForIndex, tileGlyphColor } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

interface IconTileProps {
  /** フォールバック用ラベル（icon がない場合の先頭1文字） */
  label: string;
  /** Ionicons のアイコン名。指定時はアイコンを表示する */
  icon?: string;
  /** 背景色。未指定ならテーマの iconTile 色（index ローテーション）を使う */
  color?: string;
  /** グラデーション色ローテーション用 index */
  index: number;
  size?: number;
}

function firstChar(label: string): string {
  const trimmed = (label ?? '').trim();
  return trimmed.length > 0 ? Array.from(trimmed)[0] : '?';
}

/**
 * グループ／カテゴリ用の角丸スクエアアイコン。
 * - `icon` 指定時: Ionicons をアイコン色 白固定で表示。
 * - `icon` 未指定時: 従来通り先頭1文字を表示。
 * - `color` 指定時: その色を背景に。未指定時はテーマの iconTile 色をローテーション。
 */
export function IconTile({ label, icon, color, index, size = 48 }: IconTileProps) {
  const { colors } = useTheme();
  const tileColor = color ?? tileColorForIndex(colors, index);
  const tileRadius = size >= 48 ? radius.iconTile : 14;
  const glyphSize = size >= 48 ? 20 : 18;
  const iconSize = Math.round(size * 0.5);

  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: tileRadius, backgroundColor: tileColor },
      ]}
    >
      {icon ? (
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={iconSize} color="#FFFFFF" />
      ) : (
        <Text
          style={[
            styles.glyph,
            { color: color ? '#FFFFFF' : tileGlyphColor(colors, index), fontSize: glyphSize },
          ]}
        >
          {firstChar(label)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: fonts.baloo800,
    fontWeight: '800',
    textAlign: 'center',
  },
});
