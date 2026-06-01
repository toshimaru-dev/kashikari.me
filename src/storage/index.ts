/**
 * AsyncStorage ラッパー。
 * 全データを 1 キーに JSON シリアライズして保存する。
 * 将来のサーバ同期に備えてバージョン付きの AppData 構造で永続化する。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppData, Group, Member, Payment } from '@/types';
import { DEFAULT_GROUP_COLOR, DEFAULT_GROUP_ICON } from '@/utils/groupPresets';

const STORAGE_KEY = 'kashikari.me/appData';
const CURRENT_VERSION = 1;

function emptyData(): AppData {
  return { version: CURRENT_VERSION, groups: [] };
}

/** 簡易ユニーク ID 生成（オフライン前提のためライブラリ非依存） */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** epoch ミリ秒（または Date）をローカル日付の `YYYY-MM-DD` へ変換する */
export function toDateString(value: number | Date = Date.now()): string {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** `YYYY-MM-DD` 形式として妥当かを簡易判定する */
export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * 旧スキーマの支払いを現行スキーマ（lender/borrowers）へマイグレーションする。
 * - 旧 `paidById` / `payerId` → `lenderId`
 * - 旧 `splitMemberIds` → `borrowerIds`
 * 欠損時はデフォルト値で補完し、構造の後方互換を確保する。
 */
function normalizePayment(raw: unknown): Payment | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const lenderId =
    (typeof p.lenderId === 'string' && p.lenderId) ||
    (typeof p.payerId === 'string' && p.payerId) ||
    (typeof p.paidById === 'string' && p.paidById) ||
    '';
  const borrowerSource = Array.isArray(p.borrowerIds)
    ? p.borrowerIds
    : Array.isArray(p.splitMemberIds)
      ? p.splitMemberIds
      : [];
  const borrowerIds = borrowerSource.filter((id): id is string => typeof id === 'string');
  const now = Date.now();
  const createdAt = typeof p.createdAt === 'number' ? p.createdAt : now;
  // date 欠損時は createdAt（作成日時）から日付を導出して後方互換を確保する
  const date =
    typeof p.date === 'string' && isValidDateString(p.date)
      ? p.date
      : toDateString(createdAt);
  return {
    id: typeof p.id === 'string' ? p.id : generateId(),
    amount: typeof p.amount === 'number' ? Math.round(p.amount) : 0,
    lenderId,
    borrowerIds,
    memo: typeof p.memo === 'string' ? p.memo : '',
    date,
    createdAt,
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : now,
    // 精算済みフラグ。欠損時は未精算（false）として後方互換を確保する
    settled: p.settled === true,
  };
}

/**
 * 単一グループの生データを現行スキーマへ正規化する（後方互換確保）。
 * color/icon 未設定の既存グループはデフォルト値で補完し、データが壊れないようにする。
 */
function normalizeGroup(raw: unknown): Group | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  return {
    id: typeof g.id === 'string' ? g.id : generateId(),
    name: typeof g.name === 'string' ? g.name : '',
    members: Array.isArray(g.members)
      ? g.members
          .filter((m): m is Member => !!m && typeof m === 'object')
          .map((m) => ({ id: m.id ?? generateId(), name: m.name ?? '' }))
      : [],
    createdAt: typeof g.createdAt === 'number' ? g.createdAt : Date.now(),
    updatedAt: typeof g.updatedAt === 'number' ? g.updatedAt : Date.now(),
    color: typeof g.color === 'string' && g.color ? g.color : DEFAULT_GROUP_COLOR,
    icon: typeof g.icon === 'string' && g.icon ? g.icon : DEFAULT_GROUP_ICON,
    payments: Array.isArray(g.payments)
      ? g.payments.map(normalizePayment).filter((p): p is Payment => p !== null)
      : [],
  };
}

/** 読み込んだ生データを現行スキーマへ正規化する（後方互換確保） */
function normalize(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') return emptyData();
  const data = raw as Partial<AppData>;
  const groups = Array.isArray(data.groups) ? data.groups : [];
  const normalizedGroups: Group[] = groups
    .map(normalizeGroup)
    .filter((g): g is Group => g !== null);
  return { version: CURRENT_VERSION, groups: normalizedGroups };
}

export async function loadData(): Promise<AppData> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return emptyData();
    return normalize(JSON.parse(json));
  } catch (e) {
    // 破損時も落とさず空データで継続
    console.warn('[storage] loadData failed, returning empty data', e);
    return emptyData();
  }
}

async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function getGroups(): Promise<Group[]> {
  const data = await loadData();
  // 新しい順（作成日時の降順）で返す
  return [...data.groups].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getGroup(id: string): Promise<Group | undefined> {
  const data = await loadData();
  return data.groups.find((g) => g.id === id);
}

export interface GroupInput {
  name: string;
  members: { id?: string; name: string }[];
  /** グループカラー（省略時はデフォルトカラー） */
  color?: string;
  /** グループアイコン（省略時はデフォルトアイコン） */
  icon?: string;
}

export async function createGroup(input: GroupInput): Promise<Group> {
  const data = await loadData();
  const now = Date.now();
  const group: Group = {
    id: generateId(),
    name: input.name.trim(),
    members: input.members.map((m) => ({
      id: m.id ?? generateId(),
      name: m.name.trim(),
    })),
    createdAt: now,
    updatedAt: now,
    color: input.color ?? DEFAULT_GROUP_COLOR,
    icon: input.icon ?? DEFAULT_GROUP_ICON,
    payments: [],
  };
  data.groups.push(group);
  await saveData(data);
  return group;
}

export async function updateGroup(id: string, input: GroupInput): Promise<Group | undefined> {
  const data = await loadData();
  const idx = data.groups.findIndex((g) => g.id === id);
  if (idx === -1) return undefined;
  const existing = data.groups[idx];
  const updated: Group = {
    ...existing,
    name: input.name.trim(),
    members: input.members.map((m) => ({
      id: m.id ?? generateId(),
      name: m.name.trim(),
    })),
    color: input.color ?? existing.color ?? DEFAULT_GROUP_COLOR,
    icon: input.icon ?? existing.icon ?? DEFAULT_GROUP_ICON,
    updatedAt: Date.now(),
  };
  data.groups[idx] = updated;
  await saveData(data);
  return updated;
}

export async function deleteGroup(id: string): Promise<void> {
  const data = await loadData();
  data.groups = data.groups.filter((g) => g.id !== id);
  await saveData(data);
}

/* ===================== 支払い（Payment）CRUD ===================== */

export interface PaymentInput {
  amount: number;
  /** 貸した人のメンバーID */
  lenderId: string;
  /** 借りた人のメンバーID（1人以上） */
  borrowerIds: string[];
  memo: string;
  /** 借りた日付（`YYYY-MM-DD`）。省略・無効時は今日の日付を使用 */
  date?: string;
}

/** 指定グループの支払い一覧を時系列（新しい順）で返す */
export async function getPayments(groupId: string): Promise<Payment[]> {
  const group = await getGroup(groupId);
  if (!group) return [];
  return [...(group.payments ?? [])].sort((a, b) => b.createdAt - a.createdAt);
}

/** 単一の支払いを取得 */
export async function getPayment(
  groupId: string,
  paymentId: string
): Promise<Payment | undefined> {
  const group = await getGroup(groupId);
  return (group?.payments ?? []).find((p) => p.id === paymentId);
}

export async function addPayment(
  groupId: string,
  input: PaymentInput
): Promise<Payment | undefined> {
  const data = await loadData();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) return undefined;
  const now = Date.now();
  const payment: Payment = {
    id: generateId(),
    amount: Math.round(input.amount),
    lenderId: input.lenderId,
    borrowerIds: [...input.borrowerIds],
    memo: input.memo.trim(),
    date: input.date && isValidDateString(input.date) ? input.date : toDateString(now),
    createdAt: now,
    updatedAt: now,
    // 新規支払いは常に未精算で作成する
    settled: false,
  };
  group.payments = [...(group.payments ?? []), payment];
  group.updatedAt = now;
  await saveData(data);
  return payment;
}

export async function updatePayment(
  groupId: string,
  paymentId: string,
  input: PaymentInput
): Promise<Payment | undefined> {
  const data = await loadData();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) return undefined;
  const payments = group.payments ?? [];
  const idx = payments.findIndex((p) => p.id === paymentId);
  if (idx === -1) return undefined;
  const existing = payments[idx];
  const updated: Payment = {
    ...existing,
    amount: Math.round(input.amount),
    lenderId: input.lenderId,
    borrowerIds: [...input.borrowerIds],
    memo: input.memo.trim(),
    date: input.date && isValidDateString(input.date) ? input.date : existing.date,
    updatedAt: Date.now(),
  };
  payments[idx] = updated;
  group.payments = payments;
  group.updatedAt = Date.now();
  await saveData(data);
  return updated;
}

export async function deletePayment(groupId: string, paymentId: string): Promise<void> {
  const data = await loadData();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) return;
  group.payments = (group.payments ?? []).filter((p) => p.id !== paymentId);
  group.updatedAt = Date.now();
  await saveData(data);
}

/* ===================== まとめて精算 ===================== */

/**
 * グループの全未精算支払い（settled: false）を精算済み（settled: true）に一括更新して永続化する。
 */
export async function settleAllPayments(groupId: string): Promise<void> {
  const data = await loadData();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) return;
  const now = Date.now();
  group.payments = (group.payments ?? []).map((p) =>
    p.settled ? p : { ...p, settled: true, updatedAt: now }
  );
  group.updatedAt = now;
  await saveData(data);
}

/** テスト・デバッグ用：全削除 */
export async function clearAll(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
