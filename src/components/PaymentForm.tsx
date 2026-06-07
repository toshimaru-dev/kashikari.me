import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SubHeader } from './Header';
import { TextField } from './TextField';
import { PayerSelector, SplitSelector } from './MemberSelector';
import { DangerButton, PrimaryButton } from './PrimaryButton';
import type { Group } from '@/types';
import type { PaymentInput } from '@/storage';
import { isValidDateString, toDateString } from '@/storage';
import { ColorPalette, fonts, radius, spacing } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

export interface PaymentFormInitial {
  amount: number;
  lenderId: string;
  borrowerIds: string[];
  memo: string;
  /** 借りた日付（`YYYY-MM-DD`）。省略時は今日 */
  date?: string;
}

interface PaymentFormProps {
  mode: 'create' | 'edit';
  group: Group;
  initial?: PaymentFormInitial;
  onSave: (input: PaymentInput) => void;
  onCancel: () => void;
  /** 編集時のみ表示する削除アクション */
  onDelete?: () => void;
}

/** 入力中の金額文字列から数値（円・整数）を取り出す。数字以外は無視する */
function parseAmount(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 0) return 0;
  return parseInt(digits, 10);
}

/** 表示用に3桁カンマ区切りへ（先頭¥は別途付与） */
function groupDigits(value: number): string {
  return value.toLocaleString('ja-JP');
}

export function PaymentForm({ mode, group, initial, onSave, onCancel, onDelete }: PaymentFormProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const webDateInputStyle = useMemo(() => makeWebDateInputStyle(colors), [colors]);

  const [amountText, setAmountText] = useState<string>(
    initial && initial.amount > 0 ? String(initial.amount) : ''
  );
  const [lenderId, setLenderId] = useState<string | null>(initial?.lenderId ?? null);
  const [memo, setMemo] = useState<string>(initial?.memo ?? '');
  const [date, setDate] = useState<Date>(() => {
    if (initial?.date && isValidDateString(initial.date)) {
      const [y, m, d] = initial.date.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(date);

  const [borrowerIds, setBorrowerIds] = useState<string[]>(
    initial?.borrowerIds ?? []
  );

  const [amountError, setAmountError] = useState<string | null>(null);
  const [lenderError, setLenderError] = useState<string | null>(null);
  const [borrowerError, setBorrowerError] = useState<string | null>(null);

  const title = mode === 'create' ? '支払いを追加' : '支払いを編集';

  const amountValue = useMemo(() => parseAmount(amountText), [amountText]);
  const amountDisplay = amountValue > 0 ? groupDigits(amountValue) : '0';

  const onChangeAmount = (text: string) => {
    setAmountText(text.replace(/[^0-9]/g, ''));
    if (amountError) setAmountError(null);
  };

  const selectLender = (id: string) => {
    setLenderId(id);
    setBorrowerIds((prev) => prev.filter((x) => x !== id));
    if (lenderError) setLenderError(null);
  };

  const toggleBorrower = (id: string) => {
    if (id === lenderId) return;
    setBorrowerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    if (borrowerError) setBorrowerError(null);
  };

  const toggleAll = () => {
    const selectableIds = group.members.map((m) => m.id).filter((id) => id !== lenderId);
    const allSelected = selectableIds.every((id) => borrowerIds.includes(id));
    setBorrowerIds(allSelected ? [] : selectableIds);
    if (borrowerError) setBorrowerError(null);
  };

  const handleSave = () => {
    let valid = true;

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setAmountError('金額を入力してください');
      valid = false;
    } else {
      setAmountError(null);
    }

    if (!lenderId) {
      setLenderError('貸した人を選択してください');
      valid = false;
    } else {
      setLenderError(null);
    }

    const validBorrowers = borrowerIds.filter((id) => group.members.some((m) => m.id === id));
    if (validBorrowers.length === 0) {
      setBorrowerError('借りた人を1人以上選択してください');
      valid = false;
    } else {
      setBorrowerError(null);
    }

    if (!valid || !lenderId) return;

    const normalizedDate = toDateString(date);

    onSave({
      amount: amountValue,
      lenderId,
      borrowerIds: validBorrowers,
      memo: memo.trim(),
      date: normalizedDate,
    });
  };

  return (
    <View style={styles.screen}>
      <SubHeader title={title} onBack={onCancel} actionLabel="保存" onAction={handleSave} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* 金額（最上部・大きく） */}
          <View style={styles.amountBlock}>
            <View style={styles.amountRow}>
              <Text style={[styles.amountYen, amountError ? styles.amountErrorColor : null]}>¥</Text>
              <TextInput
                value={amountDisplay === '0' ? '' : amountDisplay}
                onChangeText={onChangeAmount}
                placeholder="0"
                placeholderTextColor={colors.textSub}
                keyboardType="number-pad"
                style={[styles.amountInput, amountError ? styles.amountErrorColor : null]}
                accessibilityLabel="金額"
              />
            </View>
            <View style={[styles.amountUnderline, amountError ? styles.amountUnderlineError : null]} />
            {amountError ? <Text style={styles.errorCenter}>{amountError}</Text> : null}
          </View>

          {/* 用途メモ */}
          <View style={styles.field}>
            <TextField
              label="用途（メモ）"
              value={memo}
              onChangeText={setMemo}
              placeholder="例: 夕食代、立替金"
            />
          </View>

          {/* 借りた日付 */}
          <View style={styles.field}>
            <Text style={styles.label}>借りた日付</Text>
            {Platform.OS === 'web' ? (
              React.createElement('input', {
                type: 'date',
                value: toDateString(date),
                max: toDateString(),
                onChange: (e: { target: { value: string } }) => {
                  const v = e.target.value;
                  if (isValidDateString(v)) {
                    const [y, m, d] = v.split('-').map(Number);
                    setDate(new Date(y, m - 1, d));
                  }
                },
                style: webDateInputStyle,
                'aria-label': '借りた日付',
              })
            ) : (
              <Pressable
                onPress={() => { setTempDate(date); setShowDatePicker(true); }}
                style={({ pressed }) => [
                  styles.dateBtn,
                  { opacity: pressed ? 0.8 : 1, borderColor: colors.border, backgroundColor: colors.surface },
                ]}
                accessibilityRole="button"
                accessibilityLabel="日付を選択"
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.dateBtnText, { color: colors.text }]}>
                  {`${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSub} />
              </Pressable>
            )}
          </View>

          {/* 貸した人（単一選択） */}
          <View style={styles.field}>
            <Text style={styles.label}>貸した人</Text>
            <PayerSelector members={group.members} selectedId={lenderId} onSelect={selectLender} />
            {lenderError ? <Text style={styles.error}>{lenderError}</Text> : null}
          </View>

          {/* 借りた人（複数選択） */}
          <View style={styles.field}>
            <Text style={styles.label}>借りた人</Text>
            <SplitSelector
              members={group.members}
              selectedIds={borrowerIds}
              onToggle={toggleBorrower}
              onToggleAll={toggleAll}
              disabledIds={lenderId ? [lenderId] : []}
            />
            {borrowerError ? <Text style={styles.error}>{borrowerError}</Text> : null}
          </View>

          {/* 保存 / 削除 */}
          <View style={styles.saveBlock}>
            <PrimaryButton label="保存" onPress={handleSave} />
            {mode === 'edit' && onDelete ? (
              <DangerButton label="この支払いを削除" onPress={onDelete} style={styles.deleteBtn} />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 日付選択モーダル（iOS / Android 共通） */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>借りた日付を選択</Text>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
              maximumDate={new Date()}
              locale="ja"
              onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                if (selected) setTempDate(selected);
                if (Platform.OS === 'android') {
                  setDate(selected ?? tempDate);
                  setShowDatePicker(false);
                }
              }}
              style={styles.modalPicker}
              accentColor={colors.primary}
              themeVariant={colors.bg === '#121212' ? 'dark' : 'light'}
            />
            {Platform.OS === 'ios' && (
              <Pressable
                onPress={() => { setDate(tempDate); setShowDatePicker(false); }}
                style={({ pressed }) => [styles.modalConfirm, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.modalConfirmText, { color: colors.white }]}>決定</Text>
              </Pressable>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

/** Web の <input type="date"> 用スタイル（DOM 要素なので RN StyleSheet 外で定義） */
function makeWebDateInputStyle(c: ColorPalette) {
  return {
    height: 52,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderStyle: 'solid' as const,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingLeft: 16,
    paddingRight: 16,
    fontSize: 16,
    fontFamily: fonts.jp500,
    color: c.text,
    width: '100%',
    boxSizing: 'border-box' as const,
    colorScheme: (c.bg === '#121212' ? 'dark' : 'light') as 'dark' | 'light',
  };
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalSheet: {
      paddingHorizontal: spacing.screenH,
      paddingBottom: 32,
      paddingTop: 12,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      alignItems: 'center',
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      marginBottom: 16,
    },
    modalTitle: {
      fontFamily: fonts.jp700,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
      alignSelf: 'flex-start',
    },
    modalPicker: {
      alignSelf: 'stretch',
    },
    modalConfirm: {
      alignSelf: 'stretch',
      height: 52,
      borderRadius: radius.button,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    modalConfirmText: {
      fontFamily: fonts.jp700,
      fontSize: 16,
      fontWeight: '700',
    },
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 52,
      borderRadius: radius.input,
      borderWidth: 1.5,
      paddingHorizontal: 16,
    },
    dateBtnText: {
      flex: 1,
      fontFamily: fonts.jp500,
      fontSize: 16,
    },
    flex: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.screenH,
      paddingTop: spacing['2xl'],
    },
    amountBlock: {
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    amountYen: {
      fontFamily: fonts.baloo800,
      fontSize: 34,
      fontWeight: '800',
      color: c.text,
      marginRight: 4,
    },
    amountInput: {
      fontFamily: fonts.baloo800,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -1,
      color: c.text,
      textAlign: 'center',
      minWidth: 120,
      paddingVertical: 4,
    },
    amountErrorColor: {
      color: c.error,
    },
    amountUnderline: {
      height: 2,
      alignSelf: 'stretch',
      backgroundColor: c.border,
      marginTop: 4,
    },
    amountUnderlineError: {
      backgroundColor: c.error,
    },
    errorCenter: {
      fontFamily: fonts.jp500,
      fontSize: 12,
      fontWeight: '600',
      color: c.error,
      marginTop: 6,
      textAlign: 'center',
    },
    field: {
      marginTop: spacing.fieldGap,
    },
    label: {
      fontFamily: fonts.jp700,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
      color: c.textSub,
      marginBottom: 12,
    },
    error: {
      fontFamily: fonts.jp500,
      fontSize: 12,
      fontWeight: '600',
      color: c.error,
      marginTop: 8,
    },
    saveBlock: {
      marginTop: spacing['3xl'],
      gap: 12,
    },
    deleteBtn: {
      marginTop: 4,
    },
  });
}
