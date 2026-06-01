import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AvatarStack } from './Avatar';
import { IconTile } from './IconTile';
import type { Group } from '@/types';
import { ColorPalette, fonts, formatYen, radius, spacing } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

interface GroupCardProps {
  group: Group;
  /** カラーローテーション用（一覧での並び順 index） */
  index: number;
  onPress: () => void;
}

/** 未精算金額（settled: false の支払いの合計） */
function unsettledTotal(group: Group): number {
  return (group.payments ?? [])
    .filter((p) => !p.settled)
    .reduce((sum, p) => sum + (p.amount || 0), 0);
}

export function GroupCard({ group, index, onPress }: GroupCardProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const memberCount = group.members.length;
  const unsettled = unsettledTotal(group);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadows.card, { opacity: pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`グループ ${group.name}`}
    >
      <View style={styles.top}>
        <IconTile label={group.name} icon={group.icon} color={group.color} index={index} size={48} />
        <View style={styles.titleArea}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={styles.cardSub}>{memberCount}人 のメンバー</Text>
        </View>
        <AvatarStack members={group.members} max={4} size={26} />
      </View>

      <View style={styles.bottom}>
        <View>
          <Text style={styles.totalLabel}>未精算</Text>
          <Text style={styles.amount}>{formatYen(unsettled)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.card,
      padding: spacing.cardPad,
      marginBottom: spacing.cardGap,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    titleArea: {
      flex: 1,
    },
    cardTitle: {
      fontFamily: fonts.jp800,
      fontSize: 16,
      fontWeight: '800',
      lineHeight: 20,
      color: c.text,
    },
    cardSub: {
      fontFamily: fonts.jp500,
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 16,
      color: c.textSub,
      marginTop: 2,
    },
    bottom: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    totalLabel: {
      fontFamily: fonts.jp500,
      fontSize: 11,
      fontWeight: '600',
      lineHeight: 14,
      color: c.textSub,
    },
    amount: {
      fontFamily: fonts.baloo800,
      fontSize: 22,
      fontWeight: '800',
      lineHeight: 26,
      letterSpacing: -0.5,
      color: c.text,
      marginTop: 2,
    },
  });
}
