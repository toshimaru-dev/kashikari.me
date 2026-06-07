/**
 * Firebase 初期化。
 *
 * 設定が placeholder（未設定）でもアプリが落ちないよう、
 * 初期化を try/catch でガードし、`db` が null になり得ることを許容する。
 * Firestore ストレージ層（src/storage/firestore.ts）側で db の null チェックを行う。
 *
 * Auth の永続化:
 * - React Native (iOS/Android): getReactNativePersistence + AsyncStorage を使用
 * - Web: getAuth を使用（ブラウザのデフォルト永続化）
 * Auth の初期化失敗が db を巻き込まないよう try/catch を分離している。
 */
import { Platform } from 'react-native';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { initializeAuth, getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAyx2Jg2-MqinVGy1SwZ-WjEjzV1slOEuk',
  authDomain: 'kashikari-me-d5fdf.firebaseapp.com',
  projectId: 'kashikari-me-d5fdf',
  storageBucket: 'kashikari-me-d5fdf.firebasestorage.app',
  messagingSenderId: '259048619769',
  appId: '1:259048619769:web:c2e1659a46b84dd43a6c28',
};

/** config が placeholder のままかどうか（未設定判定） */
export const isFirebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

// アプリ初期化
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
} catch (e) {
  console.warn('[firebase] app/db initialization failed', e);
  app = null;
  db = null;
}

// Auth 初期化（プラットフォーム別・db と独立して try/catch）
if (app) {
  try {
    if (Platform.OS !== 'web') {
      // React Native: AsyncStorage で UID を永続化
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getReactNativePersistence } = require('firebase/auth');
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    } else {
      // Web: ブラウザデフォルト永続化（localStorage）
      auth = getAuth(app);
    }
  } catch (e) {
    console.warn('[firebase] auth initialization failed, falling back to getAuth', e);
    try {
      auth = getAuth(app);
    } catch {
      auth = null;
    }
  }
}

export { app, db, auth };
