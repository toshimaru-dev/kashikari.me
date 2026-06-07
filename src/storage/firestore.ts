/**
 * Firestore ストレージ層。
 *
 * データ構造:
 *   groups/{groupId}                       … グループ本体
 *   groups/{groupId}/payments/{paymentId}  … 支払い（subcollection）
 *
 * 設計方針:
 * - Firestore 未設定（config が placeholder）・接続失敗時もアプリを止めない。
 *   購読系は no-op のアンサブスクライブ関数を返し、書き込み系はエラーを投げる代わりに
 *   呼び出し側で握れるよう Promise.reject させる（呼び出し側は try/catch する）。
 * - 既存の AsyncStorage 層（src/storage/index.ts）の関数シグネチャに極力合わせる。
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  arrayUnion,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Group, Member, Payment } from '@/types';
import { DEFAULT_GROUP_COLOR, DEFAULT_GROUP_ICON } from '@/utils/groupPresets';

/** 簡易ユニーク ID 生成（Firestore のドキュメントID生成にも使えるが、ここでは payment 用） */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toDateString(value: number | Date = Date.now()): string {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** createdAt が Firestore Timestamp / number いずれでも number(ms) へ正規化する */
function timestampToMs(value: unknown, fallback: number): number {
  if (typeof value === 'number') return value;
  if (value instanceof Timestamp) return value.toMillis();
  return fallback;
}

const NOT_CONFIGURED = new Error(
  'Firestore が未設定です。src/firebase/config.ts に Firebase の設定を入力してください。'
);

/* ===================== 入力型 ===================== */

export interface GroupInput {
  name: string;
  members: { id?: string; name: string }[];
  color?: string;
  icon?: string;
}

export interface PaymentInput {
  amount: number;
  lenderId: string;
  borrowerIds: string[];
  memo: string;
  date?: string;
}

/* ===================== 正規化 ===================== */

function normalizeMembers(raw: unknown): Member[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map((m) => ({
      id: typeof m.id === 'string' ? m.id : generateId(),
      name: typeof m.name === 'string' ? m.name : '',
    }));
}

function docToGroup(id: string, data: Record<string, unknown>): Group {
  const now = Date.now();
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    members: normalizeMembers(data.members),
    createdAt: timestampToMs(data.createdAt, now),
    updatedAt: timestampToMs(data.updatedAt, now),
    color: typeof data.color === 'string' && data.color ? data.color : DEFAULT_GROUP_COLOR,
    icon: typeof data.icon === 'string' && data.icon ? data.icon : DEFAULT_GROUP_ICON,
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
    participantIds: Array.isArray(data.participantIds)
      ? data.participantIds.filter((x): x is string => typeof x === 'string')
      : [],
  };
}

function docToPayment(id: string, groupId: string, data: Record<string, unknown>): Payment {
  const now = Date.now();
  const createdAt = timestampToMs(data.createdAt, now);
  const date =
    typeof data.date === 'string' && isValidDateString(data.date)
      ? data.date
      : toDateString(createdAt);
  return {
    id,
    groupId,
    amount: typeof data.amount === 'number' ? Math.round(data.amount) : 0,
    lenderId: typeof data.lenderId === 'string' ? data.lenderId : '',
    borrowerIds: Array.isArray(data.borrowerIds)
      ? data.borrowerIds.filter((x): x is string => typeof x === 'string')
      : [],
    memo: typeof data.memo === 'string' ? data.memo : '',
    date,
    createdAt,
    updatedAt: timestampToMs(data.updatedAt, createdAt),
    settled: data.settled === true,
  };
}

/* ===================== グループ ===================== */

/**
 * 指定ユーザーが参加しているグループをリアルタイム購読する。
 * participantIds に userId を含むグループを対象にする。
 * 返り値はアンサブスクライブ関数。
 */
export function subscribeGroups(
  userId: string,
  onUpdate: (groups: Group[]) => void,
  onError?: (e: unknown) => void
): () => void {
  if (!db) {
    // 未設定時は空配列を一度通知して no-op を返す
    onUpdate([]);
    return () => {};
  }
  const q = query(collection(db, 'groups'), where('participantIds', 'array-contains', userId));
  const unsub = onSnapshot(
    q,
    (snap) => {
      const groups: Group[] = [];
      snap.forEach((d) => {
        groups.push(docToGroup(d.id, d.data() as Record<string, unknown>));
      });
      // 新しい順
      groups.sort((a, b) => b.createdAt - a.createdAt);
      onUpdate(groups);
    },
    (err) => {
      console.warn('[firestore] subscribeGroups error', err);
      onError?.(err);
    }
  );
  return unsub;
}

/** 単一グループ取得 */
export async function getGroup(groupId: string): Promise<Group | undefined> {
  if (!db) return undefined;
  const ref = doc(db, 'groups', groupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return undefined;
  return docToGroup(snap.id, snap.data() as Record<string, unknown>);
}

/** グループ作成。作成者を owner かつ participant に設定する。 */
export async function createGroup(input: GroupInput, userId: string): Promise<Group> {
  if (!db) throw NOT_CONFIGURED;
  const ref = doc(collection(db, 'groups'));
  const members: Member[] = input.members.map((m) => ({
    id: m.id ?? generateId(),
    name: m.name.trim(),
  }));
  const payload = {
    name: input.name.trim(),
    members,
    color: input.color ?? DEFAULT_GROUP_COLOR,
    icon: input.icon ?? DEFAULT_GROUP_ICON,
    ownerId: userId,
    participantIds: [userId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
  const now = Date.now();
  return {
    id: ref.id,
    name: payload.name,
    members,
    color: payload.color,
    icon: payload.icon,
    ownerId: userId,
    participantIds: [userId],
    createdAt: now,
    updatedAt: now,
  };
}

/** グループ更新（name / members / color / icon）。 */
export async function updateGroup(groupId: string, input: GroupInput): Promise<void> {
  if (!db) throw NOT_CONFIGURED;
  const members: Member[] = input.members.map((m) => ({
    id: m.id ?? generateId(),
    name: m.name.trim(),
  }));
  await updateDoc(doc(db, 'groups', groupId), {
    name: input.name.trim(),
    members,
    color: input.color ?? DEFAULT_GROUP_COLOR,
    icon: input.icon ?? DEFAULT_GROUP_ICON,
    updatedAt: serverTimestamp(),
  });
}

/** グループ削除（payments subcollection も削除）。 */
export async function deleteGroup(groupId: string): Promise<void> {
  if (!db) throw NOT_CONFIGURED;
  // payments subcollection を取得して batch 削除
  const paymentsSnap = await getDocs(collection(db, 'groups', groupId, 'payments'));
  const batch = writeBatch(db);
  paymentsSnap.forEach((p) => batch.delete(p.ref));
  batch.delete(doc(db, 'groups', groupId));
  await batch.commit();
}

/** participantIds に userId を追加して招待に参加する。 */
export async function joinGroup(groupId: string, userId: string): Promise<boolean> {
  if (!db) throw NOT_CONFIGURED;
  const ref = doc(db, 'groups', groupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  await updateDoc(ref, {
    participantIds: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
  return true;
}

/* ===================== 支払い ===================== */

/** 支払いをリアルタイム購読する。返り値はアンサブスクライブ関数。 */
export function subscribePayments(
  groupId: string,
  onUpdate: (payments: Payment[]) => void,
  onError?: (e: unknown) => void
): () => void {
  if (!db) {
    onUpdate([]);
    return () => {};
  }
  const q = query(collection(db, 'groups', groupId, 'payments'));
  const unsub = onSnapshot(
    q,
    (snap) => {
      const payments: Payment[] = [];
      snap.forEach((d) => {
        payments.push(docToPayment(d.id, groupId, d.data() as Record<string, unknown>));
      });
      // 新しい順
      payments.sort((a, b) => b.createdAt - a.createdAt);
      onUpdate(payments);
    },
    (err) => {
      console.warn('[firestore] subscribePayments error', err);
      onError?.(err);
    }
  );
  return unsub;
}

/** 一度だけ支払い一覧を取得する（購読しない用途向け）。 */
export async function getPayments(groupId: string): Promise<Payment[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, 'groups', groupId, 'payments'));
  const payments: Payment[] = [];
  snap.forEach((d) => {
    payments.push(docToPayment(d.id, groupId, d.data() as Record<string, unknown>));
  });
  payments.sort((a, b) => b.createdAt - a.createdAt);
  return payments;
}

/** 単一の支払いを取得 */
export async function getPayment(
  groupId: string,
  paymentId: string
): Promise<Payment | undefined> {
  if (!db) return undefined;
  const snap = await getDoc(doc(db, 'groups', groupId, 'payments', paymentId));
  if (!snap.exists()) return undefined;
  return docToPayment(snap.id, groupId, snap.data() as Record<string, unknown>);
}

export async function addPayment(
  groupId: string,
  input: PaymentInput
): Promise<Payment | undefined> {
  if (!db) throw NOT_CONFIGURED;
  const ref = doc(collection(db, 'groups', groupId, 'payments'));
  const now = Date.now();
  const date =
    input.date && isValidDateString(input.date) ? input.date : toDateString(now);
  const payload = {
    amount: Math.round(input.amount),
    lenderId: input.lenderId,
    borrowerIds: [...input.borrowerIds],
    memo: input.memo.trim(),
    date,
    settled: false,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, payload);
  // グループの updatedAt も更新（best-effort）
  try {
    await updateDoc(doc(db, 'groups', groupId), { updatedAt: serverTimestamp() });
  } catch {
    /* noop */
  }
  return { id: ref.id, groupId, ...payload };
}

export async function updatePayment(
  groupId: string,
  paymentId: string,
  input: PaymentInput
): Promise<void> {
  if (!db) throw NOT_CONFIGURED;
  const existing = await getPayment(groupId, paymentId);
  const date =
    input.date && isValidDateString(input.date)
      ? input.date
      : existing?.date ?? toDateString();
  await updateDoc(doc(db, 'groups', groupId, 'payments', paymentId), {
    amount: Math.round(input.amount),
    lenderId: input.lenderId,
    borrowerIds: [...input.borrowerIds],
    memo: input.memo.trim(),
    date,
    updatedAt: Date.now(),
  });
}

export async function deletePayment(groupId: string, paymentId: string): Promise<void> {
  if (!db) throw NOT_CONFIGURED;
  await deleteDoc(doc(db, 'groups', groupId, 'payments', paymentId));
}

/** 未精算支払いを全件 settled:true に更新する。 */
export async function settleAllPayments(groupId: string): Promise<void> {
  if (!db) throw NOT_CONFIGURED;
  const snap = await getDocs(collection(db, 'groups', groupId, 'payments'));
  const batch = writeBatch(db);
  const now = Date.now();
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    if (data.settled !== true) {
      batch.update(d.ref, { settled: true, updatedAt: now });
    }
  });
  await batch.commit();
}
