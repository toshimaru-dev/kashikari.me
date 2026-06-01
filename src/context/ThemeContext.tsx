/**
 * テーマをアプリ全体に提供する React Context。
 * - AsyncStorage でテーマIDを永続化（キー: 'kashikari.me/themeId'）。
 * - useTheme() フックで colors / gradients / shadows / themeId / setTheme を取得する。
 * - 初回は保存済みテーマを読み込み、未保存ならデフォルト（coral）を使う。
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ColorPalette,
  DEFAULT_THEME_ID,
  ThemeGradients,
  ThemeId,
  ThemeShadows,
  makeGradients,
  makeShadows,
  themes,
} from '@/theme';

const THEME_STORAGE_KEY = 'kashikari.me/themeId';

const VALID_THEME_IDS: ThemeId[] = ['green', 'blue', 'light', 'dark', 'coral'];

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (VALID_THEME_IDS as string[]).includes(value);
}

interface ThemeContextValue {
  themeId: ThemeId;
  colors: ColorPalette;
  gradients: ThemeGradients;
  shadows: ThemeShadows;
  /** ダークテーマかどうか（StatusBar の明暗切替などに使用） */
  isDark: boolean;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);

  // 起動時に永続化されたテーマIDを読み込む
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (active && isThemeId(stored)) {
          setThemeId(stored);
        }
      })
      .catch(() => {
        // 読み込み失敗時はデフォルトのまま
      });
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    AsyncStorage.setItem(THEME_STORAGE_KEY, id).catch(() => {
      // 永続化失敗してもアプリ動作は継続（メモリ上は反映済み）
    });
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const palette = themes[themeId];
    const isDark = themeId === 'dark';
    // ダークテーマはシャドウなし（elevation で浮かせず border で区別するマテリアルスタイル）
    const flatShadows: ThemeShadows = {
      card:      { shadowOpacity: 0, elevation: 0 },
      fab:       { shadowOpacity: 0, elevation: 0 },
      emptyIcon: { shadowOpacity: 0, elevation: 0 },
      header:    { shadowOpacity: 0, elevation: 0 },
    };
    return {
      themeId,
      colors: palette,
      gradients: makeGradients(palette),
      shadows: isDark ? flatShadows : makeShadows(palette),
      isDark,
      setTheme,
    };
  }, [themeId, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** テーマ（colors / gradients / shadows / themeId / setTheme）を取得するフック。 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme は ThemeProvider の内側で使用してください');
  }
  return ctx;
}
