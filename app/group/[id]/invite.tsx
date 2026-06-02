/**
 * グループ招待画面。
 * グループの参加用 QR コード（`kashikarime://join/{groupId}`）を表示する。
 * 「カメラで読み取る」ボタンでスキャナー画面（/scan）へ遷移する。
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Clipboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { SubHeader } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { getGroup } from '@/storage/firestore';
import type { Group } from '@/types';
import { ColorPalette, fonts, radius, spacing } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [group, setGroup] = useState<Group | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) {
      setLoaded(true);
      return;
    }
    getGroup(id)
      .then((g) => {
        if (!active) return;
        setGroup(g ?? null);
        setLoaded(true);
      })
      .catch((e) => {
        console.warn('[invite] getGroup failed', e);
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const joinUrl = id ? `kashikarime://join/${id}` : '';
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    Clipboard.setString(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!loaded) {
    return (
      <View style={styles.screen}>
        <SubHeader title="メンバーを招待" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.screen}>
        <SubHeader title="メンバーを招待" onBack={() => router.back()} />
        <View style={styles.center}>
          <EmptyState
            heading="グループが見つかりません"
            description="削除されたか、リンクが無効になっています。"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SubHeader title="メンバーを招待" onBack={() => router.back()} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.groupName} numberOfLines={2}>
          {group.name}
        </Text>
        <Text style={styles.hint}>
          このQRコードを相手のカメラで読み取ると、{'\n'}グループに参加できます。
        </Text>

        <View style={[styles.qrCard, shadows.card]}>
          <QRCode
            value={joinUrl}
            size={240}
            color={colors.text}
            backgroundColor={colors.surface}
          />
        </View>

        {/* URLコピーボタン（シミュレーター検証・QR非対応時に使用） */}
        <Pressable
          onPress={copyUrl}
          style={({ pressed }) => [styles.copyButton, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="招待URLをコピー"
        >
          <Ionicons
            name={copied ? 'checkmark-outline' : 'copy-outline'}
            size={18}
            color={colors.primary}
          />
          <Text style={styles.copyLabel}>
            {copied ? 'コピーしました' : '招待URLをコピー'}
          </Text>
        </Pressable>

        <Text style={styles.urlLabel} selectable>
          {joinUrl}
        </Text>

        <Pressable
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [styles.scanButton, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="カメラで読み取る"
        >
          <Ionicons name="camera-outline" size={20} color={colors.white} />
          <Text style={styles.scanLabel}>カメラで読み取る</Text>
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
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      paddingHorizontal: spacing.screenH,
      paddingTop: spacing.xl,
      alignItems: 'center',
    },
    groupName: {
      fontFamily: fonts.jp800,
      fontSize: 20,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
    },
    hint: {
      fontFamily: fonts.jp500,
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 20,
      color: c.textSub,
      textAlign: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
    },
    qrCard: {
      backgroundColor: c.surface,
      borderRadius: radius.card,
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    urlLabel: {
      fontFamily: fonts.jp500,
      fontSize: 12,
      color: c.textSub,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 44,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.primary,
      alignSelf: 'stretch',
      marginTop: spacing.xl,
    },
    copyLabel: {
      fontFamily: fonts.jp700,
      fontSize: 14,
      fontWeight: '700',
      color: c.primary,
    },
    scanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      borderRadius: 18,
      backgroundColor: c.primary,
      alignSelf: 'stretch',
      marginTop: spacing['3xl'],
    },
    scanLabel: {
      fontFamily: fonts.jp700,
      fontSize: 15,
      fontWeight: '700',
      color: c.white,
    },
  });
}
