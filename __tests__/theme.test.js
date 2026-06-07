/**
 * テーマ機能ユニットテスト。
 * - 4テーマが ColorPalette の全キーを持つこと
 * - パレット派生のグラデーション・シャドウ・アイコンタイル色・輝度判定
 *
 * theme.ts は外部 import を持たないため typescript.transpileModule で素の JS に変換して検証する。
 * 実行: node __tests__/theme.test.js
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const themePath = path.resolve(__dirname, '../src/theme.ts');
const tsSrc = fs.readFileSync(themePath, 'utf8');
const jsOut = ts.transpileModule(tsSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText;

const sandboxModule = { exports: {} };
const fn = new Function('module', 'exports', 'require', jsOut);
fn(sandboxModule, sandboxModule.exports, require);
const {
  themes,
  colors,
  makeGradients,
  makeShadows,
  tileColorForIndex,
  tileGlyphColor,
  avatarColorForIndex,
  isLightColor,
  DEFAULT_THEME_ID,
} = sandboxModule.exports;

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error('  ✗ FAIL:', msg);
  }
}

const REQUIRED_KEYS = [
  'primary',
  'primaryDark',
  'secondary',
  'bg',
  'surface',
  'surfaceAlt',
  'text',
  'textSub',
  'border',
  'error',
  'success',
  'pillBg',
  'white',
  'headerBg',
  'headerText',
  'fabBg',
  'iconTile',
];

const THEME_IDS = ['green', 'blue', 'dark', 'light', 'coral', 'purple', 'orange', 'pink', 'teal', 'midnight'];

// 1. 全テーマが存在する
assert(THEME_IDS.every((id) => themes[id]), '10テーマすべてが定義されている');

// 2. 各テーマが全キーを持ち、iconTile が3色
for (const id of THEME_IDS) {
  const t = themes[id];
  for (const key of REQUIRED_KEYS) {
    assert(t[key] !== undefined, `${id}.${key} が定義されている`);
  }
  assert(Array.isArray(t.iconTile) && t.iconTile.length === 3, `${id}.iconTile が3色`);
}

// 3. デフォルトは coral / colors は coral 参照
assert(DEFAULT_THEME_ID === 'coral', 'デフォルトテーマは coral');
assert(colors.primary === themes.coral.primary, 'colors は themes.coral を参照（後方互換）');

// 4. 値の妥当性（spec の一部を検証）
assert(themes.green.primary === '#6FCFA0', 'green.primary = #6FCFA0');
assert(themes.blue.primary === '#2563EB', 'blue.primary = #2563EB');
assert(themes.dark.bg === '#000000', 'dark.bg = #000000');
assert(themes.coral.primary === '#FF6B6B', 'coral.primary = #FF6B6B');

// 5. グラデーション派生（header/button/emptyIcon が2色タプル）
for (const id of THEME_IDS) {
  const g = makeGradients(themes[id]);
  assert(g.header.colors.length === 2, `${id} header グラデが2色`);
  assert(g.button.colors.length === 2, `${id} button グラデが2色`);
  assert(g.emptyIcon.colors.length === 2, `${id} emptyIcon グラデが2色`);
  assert(g.header.colors[0] === themes[id].headerBg, `${id} header グラデ先頭が headerBg`);
}

// 6. シャドウ派生
for (const id of THEME_IDS) {
  const s = makeShadows(themes[id]);
  assert(s.card && s.fab && s.emptyIcon && s.header, `${id} シャドウ4種が派生`);
  assert(s.fab.shadowColor === themes[id].primary, `${id} fab シャドウ色が primary`);
}

// 7. アイコンタイル色のローテーション
assert(
  tileColorForIndex(themes.coral, 0) === themes.coral.iconTile[0],
  'tileColorForIndex(0) が iconTile[0]'
);
assert(
  tileColorForIndex(themes.coral, 3) === themes.coral.iconTile[0],
  'tileColorForIndex(3) が iconTile[0]（ローテーション）'
);

// 8. 輝度判定（明暗）
assert(isLightColor('#FFFFFF') === true, '白は明色');
assert(isLightColor('#121212') === false, 'ダーク背景は暗色');
assert(isLightColor('#FF6B6B') === false, 'コーラルは暗色扱い（白文字が読める）');

// 9. アバター色は背景に応じた文字色を返す（コントラスト確保）
for (const id of THEME_IDS) {
  const { bg, fg } = avatarColorForIndex(themes[id], 0);
  assert(typeof bg === 'string' && typeof fg === 'string', `${id} avatarColor が bg/fg を返す`);
  // 明るい背景なら text 色（暗）、暗い背景なら white を返す
  const expectFg = isLightColor(bg) ? themes[id].text : themes[id].white;
  assert(fg === expectFg, `${id} avatar 文字色がコントラストに応じて選択される`);
}

// 10. tileGlyphColor も同様にコントラスト追従
for (const id of THEME_IDS) {
  const glyph = tileGlyphColor(themes[id], 0);
  const bg = tileColorForIndex(themes[id], 0);
  const expect = isLightColor(bg) ? themes[id].text : themes[id].white;
  assert(glyph === expect, `${id} tileGlyphColor がコントラストに応じて選択される`);
}

console.log(`\nTheme tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
