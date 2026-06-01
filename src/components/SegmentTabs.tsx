import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ColorPalette, fonts, isLightColor, radius } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

export interface SegmentTab {
  key: string;
  label: string;
}

interface SegmentTabsProps {
  tabs: SegmentTab[];
  activeKey: string;
  onChange: (key: string) => void;
}

/** 支払い／精算のセグメント切替（グループ詳細） */
export function SegmentTabs({ tabs, activeKey, onChange }: SegmentTabsProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.container, shadows.card]}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        if (active) {
          return (
            <View key={tab.key} style={[styles.segment, styles.segmentActive]}>
              <Pressable
                onPress={() => onChange(tab.key)}
                style={styles.segmentInner}
                accessibilityRole="tab"
                accessibilityState={{ selected: true }}
              >
                <Text style={styles.labelActive}>{tab.label}</Text>
              </Pressable>
            </View>
          );
        }
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: false }}
          >
            <View style={styles.segmentInner}>
              <Text style={styles.labelInactive}>{tab.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: radius.segment,
      padding: 4,
      gap: 4,
    },
    segment: {
      flex: 1,
      height: 40,
      borderRadius: 12,
      overflow: 'hidden',
    },
    segmentActive: {
      backgroundColor: c.fabBg,
    },
    segmentInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    labelActive: {
      fontFamily: fonts.jp800,
      fontSize: 14,
      fontWeight: '800',
      color: isLightColor(c.fabBg) ? '#111111' : c.white,
    },
    labelInactive: {
      fontFamily: fonts.jp700,
      fontSize: 14,
      fontWeight: '700',
      color: c.textSub,
    },
  });
}
