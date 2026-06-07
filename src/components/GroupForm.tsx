import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SubHeader } from './Header';
import { TextField } from './TextField';
import { AddMemberButton, MemberInput } from './MemberInput';
import { DangerButton, PrimaryButton } from './PrimaryButton';
import { generateId } from '@/storage';
import type { GroupInput } from '@/storage';
import {
  DEFAULT_GROUP_COLOR,
  DEFAULT_GROUP_ICON,
  GROUP_COLORS,
  GROUP_ICONS,
} from '@/utils/groupPresets';
import { ColorPalette, fonts, radius, spacing } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { usePurchase, FREE_MEMBER_LIMIT } from '@/context/PurchaseContext';

export interface MemberDraft {
  key: string;
  id?: string;
  name: string;
}

export interface GroupFormInitial {
  name: string;
  members: { id?: string; name: string }[];
  color?: string;
  icon?: string;
}

interface GroupFormProps {
  mode: 'create' | 'edit';
  initial?: GroupFormInitial;
  onSave: (input: GroupInput) => void;
  onCancel: () => void;
  /** 編集時のみ表示する削除アクション */
  onDelete?: () => void;
  /** 編集時のみ表示する「メンバーを招待」アクション */
  onInvite?: () => void;
}

const MIN_MEMBERS = 2;

function buildInitialMembers(initial?: GroupFormInitial): MemberDraft[] {
  if (initial && initial.members.length > 0) {
    return initial.members.map((m) => ({ key: generateId(), id: m.id, name: m.name }));
  }
  // 新規作成時は空メンバー行を2つ用意（最低2名を促す）
  return [
    { key: generateId(), name: '' },
    { key: generateId(), name: '' },
  ];
}

export function GroupForm({
  mode,
  initial,
  onSave,
  onCancel,
  onDelete,
  onInvite,
}: GroupFormProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isPremium } = usePurchase();
  const [name, setName] = useState(initial?.name ?? '');
  const [members, setMembers] = useState<MemberDraft[]>(() => buildInitialMembers(initial));
  const [color, setColor] = useState(initial?.color ?? DEFAULT_GROUP_COLOR);
  const [icon, setIcon] = useState(initial?.icon ?? DEFAULT_GROUP_ICON);
  const [nameError, setNameError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const title = mode === 'create' ? '新規グループ' : 'グループを編集';

  const updateMemberName = (key: string, text: string) => {
    setMembers((prev) => prev.map((m) => (m.key === key ? { ...m, name: text } : m)));
    if (memberError) setMemberError(null);
  };

  const removeMember = (key: string) => {
    setMembers((prev) => prev.filter((m) => m.key !== key));
  };

  const addMember = () => {
    const namedCount = members.filter((m) => m.name.trim().length > 0).length;
    if (!isPremium && namedCount >= FREE_MEMBER_LIMIT) {
      Alert.alert(
        'メンバーの上限に達しました',
        `無料プランは${FREE_MEMBER_LIMIT}人まで。プレミアムプランで無制限に追加できます。`,
        [
          { text: 'あとで', style: 'cancel' },
          {
            text: 'アップグレード',
            onPress: () => {
              const { router } = require('expo-router');
              router.push('/paywall');
            },
          },
        ]
      );
      return;
    }
    setMembers((prev) => [...prev, { key: generateId(), name: '' }]);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const namedMembers = members
      .map((m) => ({ id: m.id, name: m.name.trim() }))
      .filter((m) => m.name.length > 0);

    let valid = true;

    if (trimmedName.length === 0) {
      setNameError('グループ名を入力してください');
      valid = false;
    } else {
      setNameError(null);
    }

    if (namedMembers.length < MIN_MEMBERS) {
      setMemberError('メンバーを2人以上追加してください');
      valid = false;
    } else {
      setMemberError(null);
    }

    if (!valid) return;

    onSave({ name: trimmedName, members: namedMembers, color, icon });
  };

  const memberRows = useMemo(
    () =>
      members.map((m, i) => (
        <MemberInput
          key={m.key}
          index={i}
          name={m.name}
          onChangeName={(text) => updateMemberName(m.key, text)}
          onRemove={() => removeMember(m.key)}
        />
      )),
    [members, memberError]
  );

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
          <TextField
            label="グループ名"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (nameError) setNameError(null);
            }}
            placeholder="例: 北海道旅行 2026"
            error={nameError}
          />

          <View style={styles.field}>
            <Text style={styles.inputLabel}>カラー</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorRow}
              keyboardShouldPersistTaps="handled"
            >
              {GROUP_COLORS.map((c) => {
                const selected = c.value === color;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setColor(c.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`カラー ${c.id}`}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c.value },
                      selected && styles.colorSwatchSelected,
                    ]}
                  >
                    {selected ? (
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.inputLabel}>アイコン</Text>
            <View style={styles.iconGrid}>
              {GROUP_ICONS.map((ic) => {
                const selected = ic.id === icon;
                return (
                  <Pressable
                    key={ic.id}
                    onPress={() => setIcon(ic.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`アイコン ${ic.label}`}
                    style={styles.iconCell}
                  >
                    <View
                      style={[
                        styles.iconTile,
                        { backgroundColor: color },
                        selected && styles.iconTileSelected,
                      ]}
                    >
                      <Ionicons
                        name={ic.id as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color="#FFFFFF"
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.inputLabel}>メンバー</Text>
            {memberRows}
            {memberError ? <Text style={styles.memberError}>{memberError}</Text> : null}
            <AddMemberButton onPress={addMember} />
          </View>

          <View style={styles.saveBlock}>
            <PrimaryButton label="保存" onPress={handleSave} />
            {mode === 'edit' && onInvite ? (
              <Pressable
                onPress={onInvite}
                style={({ pressed }) => [styles.inviteBtn, { opacity: pressed ? 0.85 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="メンバーを招待"
              >
                <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                <Text style={styles.inviteLabel}>メンバーを招待</Text>
              </Pressable>
            ) : null}
            {mode === 'edit' && onDelete ? (
              <DangerButton label="グループを削除" onPress={onDelete} style={styles.deleteBtn} />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    },
    field: {
      marginTop: spacing.fieldGap,
    },
    inputLabel: {
      fontFamily: fonts.jp700,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
      color: c.textSub,
      marginBottom: 12,
    },
    memberError: {
      fontFamily: fonts.jp500,
      fontSize: 12,
      fontWeight: '600',
      color: c.error,
      marginBottom: 4,
    },
    colorRow: {
      gap: 12,
      paddingVertical: 2,
      paddingRight: 4,
    },
    colorSwatch: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorSwatchSelected: {
      borderColor: c.surface,
      // 選択中は白枠の外側にもう一段リングを出してテーマ背景上でも視認できるようにする
      ...Platform.select({
        web: { boxShadow: `0 0 0 2px ${c.text}` },
        default: {
          shadowColor: c.text,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 3,
          elevation: 4,
        },
      }),
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    iconCell: {
      // 4列グリッド。gap 12 を考慮し (100% - 36px) / 4 相当の固定幅にする
      width: 56,
    },
    iconTile: {
      width: 56,
      height: 56,
      borderRadius: radius.iconTile,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    iconTileSelected: {
      borderColor: c.text,
      ...Platform.select({
        web: { boxShadow: `0 4px 10px rgba(0,0,0,0.18)` },
        default: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 5,
        },
      }),
    },
    saveBlock: {
      marginTop: spacing['3xl'],
      gap: 12,
    },
    inviteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: c.primary,
      backgroundColor: c.surface,
    },
    inviteLabel: {
      fontFamily: fonts.jp700,
      fontSize: 15,
      fontWeight: '700',
      color: c.primary,
    },
    deleteBtn: {
      marginTop: 4,
    },
  });
}
