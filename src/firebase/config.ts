/**
 * Firebase 初期化。
 *
 * 設定が placeholder（未設定）でもアプリが落ちないよう、
 * 初期化を try/catch でガードし、`db` が null になり得ることを許容する。
 * Firestore ストレージ層（src/storage/firestore.ts）側で db の null チェックを行う。
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

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

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
} catch (e) {
  // 初期化に失敗してもアプリを止めない（プロトタイプ用フォールバック）
  console.warn('[firebase] initialization failed; running without Firestore', e);
  app = null;
  db = null;
}

export { app, db };
