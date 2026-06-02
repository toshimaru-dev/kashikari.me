/**
 * QR スキャナー画面。
 * expo-camera の CameraView で `kashikarime://join/{groupId}` 形式の QR を読み取る。
 * expo-camera ネイティブモジュールが利用できない環境（Expo Go など）では
 * Development Build が必要な旨を案内する。
 */
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { SubHeader } from '@/components/Header';
import { PrimaryButton } from '@/components/PrimaryButton';
import { joinGroup } from '@/storage/firestore';
import { parseJoinUrl } from '@/utils/joinUrl';
import { ColorPalette, fonts, spacing } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';

// expo-camera はネイティブモジュールが必要（Development Build）
// Expo Go では利用不可のため lazy require でガードする
let CameraView: any = null;
let useCameraPermissions: (() => [any, () => Promise<any>]) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {
  // Expo Go 環境では expo-camera ネイティブモジュールが存在しない
}

const isExpoGo = Constants.appOwnership === 'expo';

export default function ScanScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { userId } = useUser();
  const [processing, setProcessing] = useState(false);
  const handledRef = useRef(false);

  // Expo Go または expo-camera 未対応環境ではフォールバック画面を表示
  if (isExpoGo || !CameraView || !useCameraPermissions) {
    return <DevBuildRequired colors={colors} styles={styles} />;
  }

  return (
    <CameraScanner
      colors={colors}
      styles={styles}
      userId={userId}
      processing={processing}
      setProcessing={setProcessing}
      handledRef={handledRef}
    />
  );
}

/** Expo Go 向けフォールバック画面 */
function DevBuildRequired({ colors, styles }: { colors: any; styles: any }) {
  return (
    <View style={styles.screen}>
      <SubHeader title="QRコードを読み取る" onBack={() => router.back()} />
      <View style={styles.center}>
        <Ionicons name="construct-outline" size={52} color={colors.textSub} />
        <Text style={styles.titleText}>Development Build が必要です</Text>
        <Text style={styles.bodyText}>
          QRスキャン機能はカメラへのネイティブアクセスが必要なため、
          Expo Go では動作しません。{'\n\n'}
          EAS Build で Development Build を作成してください：
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>eas build --profile development</Text>
        </View>
        <View style={styles.backBtn}>
          <PrimaryButton label="戻る" onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}

/** カメラスキャナー本体（Development Build 専用） */
function CameraScanner({ colors, styles, userId, processing, setProcessing, handledRef }: any) {
  const [permission, requestPermission] = useCameraPermissions!();

  const handleScanned = async (data: string) => {
    if (handledRef.current || processing) return;
    const groupId = parseJoinUrl(data);
    if (!groupId) return;
    handledRef.current = true;
    setProcessing(true);

    if (!userId) {
      Alert.alert('エラー', 'ユーザー情報を取得できませんでした。', [
        { text: 'OK', onPress: () => resetScan() },
      ]);
      return;
    }

    try {
      const ok = await joinGroup(groupId, userId);
      if (!ok) {
        Alert.alert('参加できませんでした', 'グループが見つかりませんでした。', [
          { text: 'OK', onPress: () => resetScan() },
        ]);
        return;
      }
      router.replace(`/group/${groupId}`);
    } catch {
      Alert.alert('参加できませんでした', 'ネットワークまたは Firebase 設定を確認してください。', [
        { text: 'OK', onPress: () => resetScan() },
      ]);
    }
  };

  const resetScan = () => {
    handledRef.current = false;
    setProcessing(false);
  };

  if (!permission) {
    return (
      <View style={styles.screen}>
        <SubHeader title="QRコードを読み取る" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.screen}>
        <SubHeader title="QRコードを読み取る" onBack={() => router.back()} />
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color={colors.textSub} />
          <Text style={styles.bodyText}>
            QRコードを読み取るにはカメラへのアクセスを許可してください。
          </Text>
          <View style={styles.backBtn}>
            <PrimaryButton label="カメラを許可する" onPress={requestPermission} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SubHeader title="QRコードを読み取る" onBack={() => router.back()} />
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }: { data: string }) => handleScanned(data)}
        />
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.overlayText}>招待QRコードを枠内に合わせてください</Text>
        </View>
        {processing ? (
          <View style={styles.processing} pointerEvents="none">
            <ActivityIndicator color={colors.white} />
            <Text style={styles.processingText}>参加しています...</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cancelWrap}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.cancelLabel}>閉じる</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    titleText: {
      fontFamily: fonts.jp800,
      fontSize: 18,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
    },
    bodyText: {
      fontFamily: fonts.jp500,
      fontSize: 14,
      lineHeight: 22,
      color: c.textSub,
      textAlign: 'center',
    },
    codeBlock: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignSelf: 'stretch',
    },
    codeText: {
      fontFamily: 'monospace',
      fontSize: 13,
      color: c.text,
      textAlign: 'center',
    },
    backBtn: { alignSelf: 'stretch', marginTop: spacing.sm },
    cameraWrap: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
    overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: '#FFF' },
    overlayText: {
      fontFamily: fonts.jp700,
      fontSize: 14,
      fontWeight: '700',
      color: '#FFF',
      textAlign: 'center',
      marginTop: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
    processing: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      gap: spacing.sm,
    },
    processingText: { fontFamily: fonts.jp700, fontSize: 14, fontWeight: '700', color: c.white },
    cancelWrap: { paddingHorizontal: spacing.screenH, paddingVertical: spacing.lg },
    cancelBtn: {
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: c.surface,
    },
    cancelLabel: { fontFamily: fonts.jp700, fontSize: 15, fontWeight: '700', color: c.text },
  });
}
