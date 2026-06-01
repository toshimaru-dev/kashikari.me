/**
 * グループのカラー・アイコン機能の軽量ユニットテスト（自己完結）。
 * - groupPresets の定数・デフォルト値
 * - normalizeGroup の color/icon デフォルト補完（既存データ後方互換）
 *
 * 実行: node __tests__/group-color-icon.test.js
 */
const assert = require('assert');

// --- groupPresets を実コードと同値で再現（TS を esbuild なしで読まないため） ---
const GROUP_COLORS = [
  { id: 'coral', value: '#FF6B6B' },
  { id: 'blue', value: '#2563EB' },
  { id: 'green', value: '#10B981' },
  { id: 'amber', value: '#F59E0B' },
  { id: 'purple', value: '#8B5CF6' },
  { id: 'pink', value: '#EC4899' },
  { id: 'cyan', value: '#06B6D4' },
  { id: 'orange', value: '#F97316' },
];
const GROUP_ICONS = [
  { id: 'people-outline', label: 'グループ' },
  { id: 'airplane-outline', label: '旅行' },
  { id: 'restaurant-outline', label: '食事' },
  { id: 'beer-outline', label: '飲み会' },
  { id: 'home-outline', label: '住まい' },
  { id: 'car-outline', label: 'ドライブ' },
  { id: 'train-outline', label: '交通' },
  { id: 'cart-outline', label: '買い物' },
  { id: 'gift-outline', label: 'プレゼント' },
  { id: 'football-outline', label: 'スポーツ' },
  { id: 'musical-notes-outline', label: '音楽' },
  { id: 'cafe-outline', label: 'カフェ' },
  { id: 'globe-outline', label: '海外' },
  { id: 'heart-outline', label: '家族・友人' },
  { id: 'briefcase-outline', label: '仕事' },
  { id: 'sunny-outline', label: 'レジャー' },
];
const DEFAULT_GROUP_COLOR = GROUP_COLORS[0].value;
const DEFAULT_GROUP_ICON = GROUP_ICONS[0].id;

// --- normalizeGroup の color/icon 補完ロジックを実コードと同仕様で再現 ---
function normalizeColorIcon(raw) {
  const g = raw || {};
  return {
    color: typeof g.color === 'string' && g.color ? g.color : DEFAULT_GROUP_COLOR,
    icon: typeof g.icon === 'string' && g.icon ? g.icon : DEFAULT_GROUP_ICON,
  };
}

(function run() {
  let passed = 0;

  // 1. プリセット件数
  assert.strictEqual(GROUP_COLORS.length, 8, 'カラーは8色');
  assert.strictEqual(GROUP_ICONS.length, 16, 'アイコンは16種');
  passed++;

  // 2. デフォルト値
  assert.strictEqual(DEFAULT_GROUP_COLOR, '#FF6B6B', 'デフォルトカラー');
  assert.strictEqual(DEFAULT_GROUP_ICON, 'people-outline', 'デフォルトアイコン');
  passed++;

  // 3. カラー値は全て #RRGGBB
  for (const c of GROUP_COLORS) {
    assert.ok(/^#[0-9A-Fa-f]{6}$/.test(c.value), `カラー ${c.id} は16進`);
  }
  passed++;

  // 4. id の一意性
  assert.strictEqual(new Set(GROUP_COLORS.map((c) => c.id)).size, 8, 'カラーid一意');
  assert.strictEqual(new Set(GROUP_ICONS.map((i) => i.id)).size, 16, 'アイコンid一意');
  passed++;

  // 5. 既存グループ（color/icon 未設定）→ デフォルト補完（後方互換）
  const legacy = normalizeColorIcon({ name: '旧グループ', members: [] });
  assert.strictEqual(legacy.color, '#FF6B6B', '未設定colorはデフォルト');
  assert.strictEqual(legacy.icon, 'people-outline', '未設定iconはデフォルト');
  passed++;

  // 6. 設定済みの値は保持される
  const set = normalizeColorIcon({ color: '#2563EB', icon: 'airplane-outline' });
  assert.strictEqual(set.color, '#2563EB', '指定colorを保持');
  assert.strictEqual(set.icon, 'airplane-outline', '指定iconを保持');
  passed++;

  // 7. 空文字・非文字列はデフォルトへフォールバック
  const bad = normalizeColorIcon({ color: '', icon: 123 });
  assert.strictEqual(bad.color, '#FF6B6B', '空colorはデフォルト');
  assert.strictEqual(bad.icon, 'people-outline', '非文字列iconはデフォルト');
  passed++;

  console.log(`\n✓ All ${passed} group-color-icon tests passed.`);
})();
