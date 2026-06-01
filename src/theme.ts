/**
 * デザイントークン（design.md 由来）
 * 色・角丸・スペーシング・グラデーション・タイポグラフィを一元管理する。
 *
 * テーマ切り替え対応:
 * - 4つのカラーパレット（green / blue / dark / coral）を `themes` に定義。
 * - 色は ThemeContext 経由で `useTheme()` から取得する（コンポーネントはランタイムで再描画）。
 * - `colors` は後方互換のため `themes.coral` を参照する（テーマ非対応の静的参照向け）。
 * - `gradients` / `shadows` はパレットから派生させるため `makeGradients()` / `makeShadows()` を用意。
 */

export type ThemeId = 'green' | 'blue' | 'dark' | 'light' | 'coral';

export interface ColorPalette {
  primary: string;
  primaryDark: string;
  secondary: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSub: string;
  border: string;
  error: string;
  success: string;
  pillBg: string;
  white: string;
  headerBg: string; // ヘッダー背景色
  headerText: string; // ヘッダーテキスト色
  fabBg: string; // FABボタン背景色
  iconTile: string[]; // アイコンタイルの色（3色）
}

export const themes: Record<ThemeId, ColorPalette> = {
  green: {
    primary: '#6FCFA0',
    primaryDark: '#4CAF82',
    secondary: '#4ECDC4',
    bg: '#F4FBF7',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF7F2',
    text: '#1C3028',
    textSub: '#6B8F7A',
    border: '#C8E6D4',
    error: '#EF4444',
    success: '#3A9B6F',
    pillBg: '#D6F5E6',
    white: '#FFFFFF',
    headerBg: '#6FCFA0',
    headerText: '#FFFFFF',
    fabBg: '#6FCFA0',
    iconTile: ['#6FCFA0', '#86D9B0', '#9DE3C0'],
  },
  blue: {
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    secondary: '#60A5FA',
    bg: '#F0F7FF',
    surface: '#FFFFFF',
    surfaceAlt: '#E8F1FD',
    text: '#1E293B',
    textSub: '#7B8BA8',
    border: '#DCE8FA',
    error: '#EF4444',
    success: '#16A34A',
    pillBg: '#DBEAFE',
    white: '#FFFFFF',
    headerBg: '#2563EB',
    headerText: '#FFFFFF',
    fabBg: '#2563EB',
    iconTile: ['#2563EB', '#3B82F6', '#60A5FA'],
  },
  dark: {
    primary: '#FFFFFF',
    primaryDark: '#E0E0E0',
    secondary: '#9E9E9E',
    bg: '#000000',
    surface: '#141414',
    surfaceAlt: '#1F1F1F',
    text: '#FFFFFF',
    textSub: '#757575',
    border: '#2A2A2A',
    error: '#EF5350',
    success: '#BDBDBD',
    pillBg: '#1F1F1F',
    white: '#FFFFFF',
    headerBg: '#141414',
    headerText: '#FFFFFF',
    fabBg: '#FFFFFF',
    iconTile: ['#1F1F1F', '#2A2A2A', '#383838'],
  },
  light: {
    primary: '#424242',
    primaryDark: '#212121',
    secondary: '#757575',
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceAlt: '#F0F0F0',
    text: '#212121',
    textSub: '#757575',
    border: '#E0E0E0',
    error: '#E53935',
    success: '#424242',
    pillBg: '#EEEEEE',
    white: '#FFFFFF',
    headerBg: '#424242',
    headerText: '#FFFFFF',
    fabBg: '#424242',
    iconTile: ['#616161', '#757575', '#9E9E9E'],
  },
  coral: {
    primary: '#FF6B6B',
    primaryDark: '#FF5252',
    secondary: '#4ECDC4',
    bg: '#FFF8F2',
    surface: '#FFFFFF',
    surfaceAlt: '#FFF0E8',
    text: '#2B2B3A',
    textSub: '#8A8A9C',
    border: '#F0E6DC',
    error: '#EF4444',
    success: '#0C8C83',
    pillBg: '#D8F7F4',
    white: '#FFFFFF',
    headerBg: '#FF6B6B',
    headerText: '#FFFFFF',
    fabBg: '#FF6B6B',
    iconTile: ['#FF6B6B', '#FF8E8E', '#4ECDC4'],
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'coral';

/** 後方互換: テーマ非対応の静的参照向け（デフォルト = coral）。 */
export const colors = themes.coral;

export const radius = {
  header: 26,
  card: 22,
  input: 16,
  iconTile: 16,
  button: 20,
  pill: 999,
  avatar: 999,
  emptyIcon: 34,
  segment: 14,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  screenH: 20,
  cardPad: 18,
  cardGap: 16,
  sectionGap: 16,
  fieldGap: 20,
  scrollBottom: 120,
} as const;

export interface Gradient {
  colors: readonly [string, string];
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface ThemeGradients {
  header: Gradient;
  button: Gradient;
  emptyIcon: Gradient;
}

const DIAGONAL = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
const HORIZONTAL = { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };

/** パレットからグラデーション群を派生させる（ヘッダー・ボタン・空状態アイコン）。 */
export function makeGradients(c: ColorPalette): ThemeGradients {
  return {
    header: { colors: [c.headerBg, c.primaryDark], ...DIAGONAL },
    button: { colors: [c.fabBg, c.primaryDark], ...HORIZONTAL },
    // 空状態アイコンはセカンダリ → プライマリのグラデで視認性を確保
    emptyIcon: { colors: [c.secondary, c.primary], ...DIAGONAL },
  };
}

export interface ThemeShadows {
  card: object;
  fab: object;
  emptyIcon: object;
  header: object;
}

/** パレットからシャドウ群を派生させる（影色はテーマに追従）。 */
export function makeShadows(c: ColorPalette): ThemeShadows {
  return {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: 9,
      elevation: 3,
    },
    fab: {
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 14,
      elevation: 8,
    },
    emptyIcon: {
      shadowColor: c.secondary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
    header: {
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 5,
    },
  };
}

/** 後方互換用（coral 由来）。テーマ追従が必要な箇所は useTheme() を使うこと。 */
export const gradients = makeGradients(themes.coral);
export const shadows = makeShadows(themes.coral);

/**
 * アイコンタイル（グループ／カテゴリ）の角丸スクエア色。
 * テーマの iconTile（3色）をローテーションで割り当てる。
 */
export function tileColorForIndex(c: ColorPalette, index: number): string {
  const palette = c.iconTile;
  return palette[index % palette.length];
}

/** タイル文字色（背景が明るい場合に視認性を確保）。 */
export function tileGlyphColor(c: ColorPalette, index: number): string {
  const bg = tileColorForIndex(c, index);
  return isLightColor(bg) ? c.text : c.white;
}

/**
 * テーマに依存しない固定のマルチカラーパレット。
 * どのテーマでもメンバーを色で識別できるよう、鮮やかで互いに区別しやすい色を使う。
 */
const AVATAR_COLORS = [
  '#FF6B6B', // コーラル
  '#2563EB', // ブルー
  '#10B981', // グリーン
  '#F59E0B', // アンバー
  '#8B5CF6', // パープル
  '#EC4899', // ピンク
  '#06B6D4', // シアン
  '#F97316', // オレンジ
];

/** アバター色のローテーション（テーマに依存しない固定マルチカラー）。 */
export function avatarColorForIndex(_c: ColorPalette, index: number): { bg: string; fg: string } {
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return { bg, fg: '#FFFFFF' };
}

/** 簡易輝度判定（#RRGGBB）。明るい背景なら true。 */
export function isLightColor(hex: string): boolean {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return false;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 0xff;
  const g = (int >> 8) & 0xff;
  const b = int & 0xff;
  // 相対輝度（ITU-R BT.601）
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62;
}

/** フォントファミリー名（_layout.tsx でロード） */
export const fonts = {
  jp400: 'NotoSansJP_400Regular',
  jp500: 'NotoSansJP_500Medium',
  jp700: 'NotoSansJP_700Bold',
  // Noto Sans JP は 700 が最大ウェイトのため、800 相当は 700 + fontWeight でフォールバック
  jp800: 'NotoSansJP_700Bold',
  baloo600: 'Baloo2_600SemiBold',
  baloo700: 'Baloo2_700Bold',
  baloo800: 'Baloo2_800ExtraBold',
} as const;

/** 金額を「¥1,234」形式に整形する */
export function formatYen(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(Math.round(amount));
  return `${sign}¥${abs.toLocaleString('ja-JP')}`;
}
