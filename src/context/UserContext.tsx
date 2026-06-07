/**
 * 端末ごとの匿名ユーザーID・ユーザー名を提供する Context。
 * Firebase Anonymous Auth を使用し、request.auth.uid で Security Rules を適用できる。
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
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { getOrCreateUserId, getUsername, saveUsername } from '@/storage/userId';

interface UserContextValue {
  userId: string | null;
  username: string | null;
  /** ユーザー名が設定済みかどうか（オンボーディング完了判定） */
  hasOnboarded: boolean;
  loading: boolean;
  setUsername: (name: string) => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  userId: null,
  username: null,
  hasOnboarded: false,
  loading: true,
  setUsername: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase Auth が利用できない場合はローカル UUID にフォールバック
    if (!auth) {
      let active = true;
      (async () => {
        try {
          const [id, name] = await Promise.all([getOrCreateUserId(), getUsername()]);
          if (active) {
            setUserId(id);
            setUsernameState(name);
          }
        } catch (e) {
          console.warn('[UserContext] fallback init error', e);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const name = await getUsername();
          setUserId(firebaseUser.uid);
          setUsernameState(name);
        } catch (e) {
          console.warn('[UserContext] getUsername error', e);
          setUserId(firebaseUser.uid);
        } finally {
          setLoading(false);
        }
      } else {
        // 未サインイン → 匿名サインイン（onAuthStateChanged が再発火する）
        signInAnonymously(auth!).catch(async (e) => {
          console.warn('[UserContext] signInAnonymously failed, falling back to UUID', e);
          try {
            const [id, name] = await Promise.all([getOrCreateUserId(), getUsername()]);
            setUserId(id);
            setUsernameState(name);
          } finally {
            setLoading(false);
          }
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const setUsername = useCallback(async (name: string) => {
    if (!userId) return;
    await saveUsername(userId, name);
    setUsernameState(name);
  }, [userId]);

  const value = useMemo(() => ({
    userId,
    username,
    hasOnboarded: !!username,
    loading,
    setUsername,
  }), [userId, username, loading, setUsername]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  return useContext(UserContext);
}
