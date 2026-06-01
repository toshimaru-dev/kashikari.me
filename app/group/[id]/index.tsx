import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SubHeader } from '@/components/Header';
import { SegmentTabs } from '@/components/SegmentTabs';
import { PaymentCard } from '@/components/PaymentCard';
import { SettlementRow } from '@/components/SettlementRow';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { IconTile } from '@/components/IconTile';
import { Toast } from '@/components/Toast';
import { getGroup, getPayments, settleAllPayments } from '@/storage';
import type { Group, Payment } from '@/types';
import { buildSettlementText, computeSettlement } from '@/utils/settlement';
import { confirmDestructive } from '@/utils/confirm';
import { shareText } from '@/utils/share';
import { ColorPalette, fonts, formatYen, radius, spacing } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

type TabKey = 'payments' | 'settlement' | 'settled';

const TABS = [
  { key: 'payments', label: '支払い' },
  { key: 'settlement', label: '精算' },
  { key: 'settled', label: '精算済み' },
];

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [group, setGroup] = useState<Group | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>('payments');
  const [toast, setToast] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const reload = useCallback(async (gid: string) => {
    const ps = await getPayments(gid);
    setPayments(ps);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!id) {
        setNotFound(true);
        return;
      }
      (async () => {
        const g = await getGroup(id);
        if (!active) return;
        if (!g) {
          setNotFound(true);
          setLoaded(true);
          return;
        }
        const ps = await getPayments(id);
        if (!active) return;
        setGroup(g);
        setPayments(ps);
        setLoaded(true);
      })();
      return () => {
        active = false;
      };
    }, [id])
  );

  if (!loaded) {
    return (
      <View style={styles.screen}>
        <SubHeader title="グループ" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (notFound || !group) {
    return (
      <View style={styles.screen}>
        <SubHeader title="グループ" onBack={() => router.replace('/')} />
        <View style={styles.center}>
          <EmptyState
            heading="グループが見つかりません"
            description="削除されたか、リンクが無効になっています。ホームに戻ってグループを選び直してください。"
          />
        </View>
      </View>
    );
  }

  // 未精算・精算済みで支払いを振り分ける
  const unsettledPayments = payments.filter((p) => !p.settled);
  const settledPayments = payments.filter((p) => p.settled);

  // 精算計算（純粋関数）。settled: false のみが対象。
  const settlement = computeSettlement(group, payments);
  // 総支出は未精算支払いのみを合計する（computeSettlement と同値）
  const total = settlement.total;
  const average = settlement.average;

  // メンバー id → group.members 内 index（アバター色ローテーション用）
  const memberIndex: Record<string, number> = {};
  group.members.forEach((m, i) => {
    memberIndex[m.id] = i;
  });
  const hasTransfers = settlement.transfers.length > 0;

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    const text = buildSettlementText(group, payments);
    const outcome = await shareText(text, `${group.name} の精算結果`);
    setSharing(false);
    if (outcome === 'copied') {
      setToast('精算結果をコピーしました');
    } else if (outcome === 'shared') {
      setToast('精算結果を共有しました');
    } else if (outcome === 'failed') {
      setToast('共有に失敗しました');
    }
    // cancelled はフィードバック不要
  };

  const handleSettleAll = () => {
    if (!id || !hasTransfers) return;
    confirmDestructive(
      {
        title: 'まとめて精算',
        message: '未精算の支払いを全て精算済みにしますか？',
        confirmLabel: '精算する',
      },
      async () => {
        await settleAllPayments(id);
        await reload(id);
        setToast('全ての精算を完了にしました');
        setTab('settled');
      }
    );
  };

  return (
    <View style={styles.screen}>
      <SubHeader
        title={group.name}
        onBack={() => router.back()}
        actionLabel="編集"
        onAction={() => router.push(`/group/${group.id}/edit`)}
      />

      {/* 未精算サマリーカード */}
      <View style={styles.summaryWrap}>
        <View style={[styles.summaryCard, shadows.card]}>
          <View style={styles.summaryLeft}>
            <IconTile label={group.name} icon={group.icon} color={group.color} index={0} size={44} />
            <View>
              <Text style={styles.summaryLabel}>未精算</Text>
              <Text style={styles.summaryAmount}>{formatYen(total)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.tabsWrap}>
          <SegmentTabs tabs={TABS} activeKey={tab} onChange={(k) => setTab(k as TabKey)} />
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.scrollBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'payments' ? (
          <>
            <Text style={styles.sectionLabel}>支払い履歴</Text>
            {unsettledPayments.length === 0 ? (
              <EmptyState
                heading="未精算の支払いはありません"
                description="最初の立て替えを記録してみよう"
              />
            ) : (
              unsettledPayments.map((p, index) => (
                <PaymentCard
                  key={p.id}
                  payment={p}
                  group={group}
                  index={index}
                  onPress={() => router.push(`/group/${group.id}/payment/${p.id}/edit`)}
                />
              ))
            )}
          </>
        ) : tab === 'settlement' ? (
          !hasTransfers ? (
            <EmptyState
              heading="精算する貸し借りはありません"
              description="支払いを記録すると精算案がここに出るよ"
            />
          ) : (
            <>
              {/* 精算案セクション */}
              <Text style={styles.sectionLabel}>精算案</Text>
              {settlement.transfers.map((t, i) => (
                <SettlementRow
                  key={`${t.key}-${i}`}
                  transfer={t}
                  fromIndex={memberIndex[t.fromId] ?? 0}
                  toIndex={memberIndex[t.toId] ?? 0}
                />
              ))}

              {/* まとめて精算するボタン */}
              <Pressable
                onPress={handleSettleAll}
                style={({ pressed }) => [styles.settleAllButton, { opacity: pressed ? 0.85 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="まとめて精算する"
              >
                <Ionicons name="checkmark-done" size={18} color={colors.white} />
                <Text style={styles.settleAllLabel}>まとめて精算する</Text>
              </Pressable>

              {/* 精算結果の共有・コピー */}
              <Pressable
                onPress={handleShare}
                disabled={sharing}
                style={({ pressed }) => [
                  styles.shareButton,
                  { opacity: pressed || sharing ? 0.7 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="精算結果を共有"
              >
                <Ionicons name="share-outline" size={18} color={colors.primary} />
                <Text style={styles.shareLabel}>精算結果を共有</Text>
              </Pressable>
            </>
          )
        ) : (
          /* 精算済みタブ */
          <>
            <Text style={styles.sectionLabel}>精算済みの記録</Text>
            {settledPayments.length === 0 ? (
              <EmptyState
                heading="精算済みの記録はまだありません"
                description="まとめて精算するとここに記録が残るよ"
              />
            ) : (
              settledPayments.map((p, index) => (
                <PaymentCard
                  key={p.id}
                  payment={p}
                  group={group}
                  index={index}
                  onPress={() => router.push(`/group/${group.id}/payment/${p.id}/edit`)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      {tab === 'payments' ? (
        <View
          style={[styles.fabWrap, { paddingBottom: insets.bottom + 12 }]}
          pointerEvents="box-none"
        >
          <PrimaryButton
            label="支払いを追加"
            withPlus
            onPress={() => router.push(`/group/${group.id}/payment/new`)}
          />
        </View>
      ) : null}

      <Toast message={toast} />
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
    summaryWrap: {
      paddingHorizontal: spacing.screenH,
      paddingTop: spacing.lg,
    },
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: radius.card,
      paddingHorizontal: spacing.cardPad,
      paddingVertical: spacing.lg,
    },
    summaryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    summaryRight: {
      alignItems: 'flex-end',
    },
    summaryLabel: {
      fontFamily: fonts.jp500,
      fontSize: 11,
      fontWeight: '600',
      lineHeight: 14,
      color: c.textSub,
    },
    summaryAmount: {
      fontFamily: fonts.baloo800,
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: c.text,
      marginTop: 2,
    },
    summaryAvg: {
      fontFamily: fonts.baloo800,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: c.text,
      marginTop: 2,
    },
    tabsWrap: {
      marginTop: spacing.lg,
    },
    content: {
      paddingHorizontal: spacing.screenH,
      paddingTop: spacing.xl,
    },
    sectionLabel: {
      fontFamily: fonts.jp800,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 18,
      color: c.text,
      marginBottom: spacing.sectionGap,
    },
    settleAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      borderRadius: 18,
      backgroundColor: c.secondary,
      marginTop: spacing.sm,
    },
    settleAllLabel: {
      fontFamily: fonts.jp700,
      fontSize: 15,
      fontWeight: '700',
      color: c.white,
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: c.primary,
      backgroundColor: c.surface,
      marginTop: spacing.sm,
    },
    shareLabel: {
      fontFamily: fonts.jp700,
      fontSize: 15,
      fontWeight: '700',
      color: c.primary,
    },
    fabWrap: {
      position: 'absolute',
      left: spacing.screenH,
      right: spacing.screenH,
      bottom: 0,
    },
  });
}
