import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { GroupForm, GroupFormInitial } from '@/components/GroupForm';
import { SubHeader } from '@/components/Header';
import { deleteGroup, getGroup, updateGroup } from '@/storage';
import type { GroupInput } from '@/storage';
import { confirmDestructive } from '@/utils/confirm';
import { ColorPalette } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [initial, setInitial] = useState<GroupFormInitial | null>(null);
  const [notFound, setNotFound] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!id) {
        setNotFound(true);
        return;
      }
      getGroup(id).then((group) => {
        if (!active) return;
        if (!group) {
          setNotFound(true);
          return;
        }
        setInitial({
          name: group.name,
          members: group.members.map((m) => ({ id: m.id, name: m.name })),
          color: group.color,
          icon: group.icon,
        });
      });
      return () => {
        active = false;
      };
    }, [id])
  );

  const handleSave = async (input: GroupInput) => {
    if (!id) return;
    await updateGroup(id, input);
    router.back();
  };

  const handleDelete = () => {
    if (!id) return;
    confirmDestructive(
      {
        title: 'グループを削除',
        message: 'このグループを削除しますか？この操作は元に戻せません。',
      },
      async () => {
        await deleteGroup(id);
        // 削除後は詳細画面（削除済み）へ戻らずホームへ遷移する（Sprint 2 バグ#1 修正）。
        // dismissAll で詳細・編集スタックを畳んでからホームを表示する。
        if (router.canDismiss?.()) {
          router.dismissAll();
        }
        router.replace('/');
      }
    );
  };

  if (notFound) {
    return (
      <View style={styles.screen}>
        <SubHeader title="グループを編集" onBack={() => router.back()} />
        <View style={styles.center} />
      </View>
    );
  }

  if (!initial) {
    return (
      <View style={styles.screen}>
        <SubHeader title="グループを編集" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <GroupForm
      mode="edit"
      initial={initial}
      onSave={handleSave}
      onCancel={() => router.back()}
      onDelete={handleDelete}
    />
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
