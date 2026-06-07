/**
 * 課金状態を管理する Context。
 *
 * 現在は AsyncStorage ベースのモック実装。
 * Apple Developer 登録後に react-native-purchases（RevenueCat）へ差し替える。
 *
 * 差し替え手順:
 *   1. `npx expo install react-native-purchases`
 *   2. app.json の plugins に "react-native-purchases" を追加
 *   3. このファイルの TODO コメント箇所を RevenueCat の実装に置き換える
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** 無料プランの上限 */
export const FREE_GROUP_LIMIT = 1;
export const FREE_MEMBER_LIMIT = 3;

const PREMIUM_STORAGE_KEY = 'kashikari.me/isPremium';

interface PurchaseContextValue {
  isPremium: boolean;
  loading: boolean;
  /** 課金処理（モック: AsyncStorage に保存 / 本番: RevenueCat 購入） */
  purchasePremium: () => Promise<void>;
  /** 購入復元（モック: 同上 / 本番: RevenueCat restore） */
  restorePurchases: () => Promise<void>;
  /** 開発用: プレミアム状態をトグルする（__DEV__ のみ使用） */
  _devTogglePremium: () => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextValue>({
  isPremium: false,
  loading: true,
  purchasePremium: async () => {},
  restorePurchases: async () => {},
  _devTogglePremium: async () => {},
});

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 本番実装では Purchases.configure() + getCustomerInfo() に置き換える
    AsyncStorage.getItem(PREMIUM_STORAGE_KEY)
      .then((v) => setIsPremium(v === 'true'))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const purchasePremium = useCallback(async () => {
    // TODO: 本番実装では Purchases.purchasePackage(package) に置き換える
    await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, 'true');
    setIsPremium(true);
  }, []);

  const restorePurchases = useCallback(async () => {
    // TODO: 本番実装では Purchases.restorePurchases() に置き換える
    await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, 'true');
    setIsPremium(true);
  }, []);

  const _devTogglePremium = useCallback(async () => {
    const next = !isPremium;
    await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, next ? 'true' : 'false');
    setIsPremium(next);
  }, [isPremium]);

  const value = useMemo(
    () => ({ isPremium, loading, purchasePremium, restorePurchases, _devTogglePremium }),
    [isPremium, loading, purchasePremium, restorePurchases, _devTogglePremium]
  );

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchase(): PurchaseContextValue {
  return useContext(PurchaseContext);
}
