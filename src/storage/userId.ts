/**
 * ユーザーID（UUID）管理。
 *
 * 端末ごとに 1 つの匿名ユーザーIDを AsyncStorage に永続化する。
 * 初回生成時に Firestore の users コレクションへドキュメントを作成するが、
 * Firestore 未設定・接続失敗時もアプリを止めないよう書き込みは best-effort で行う。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

const USER_ID_KEY = 'kashikari.me/userId';

/** RFC 4122 v4 UUID を純粋 JS で生成（ネイティブモジュール不要） */
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 永続化済みのユーザーIDを返す。無ければ新規生成して保存する。
 * 新規生成時は Firestore の users/{id} を作成する（失敗しても継続）。
 */
export async function getOrCreateUserId(): Promise<string> {
  const stored = await AsyncStorage.getItem(USER_ID_KEY);
  if (stored) return stored;

  const newId = generateUuid();
  await AsyncStorage.setItem(USER_ID_KEY, newId);

  // Firestore に users ドキュメントを作成（best-effort）
  if (db) {
    try {
      await setDoc(
        doc(db, 'users', newId),
        { createdAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      console.warn('[userId] failed to create user doc in Firestore', e);
    }
  }

  return newId;
}
