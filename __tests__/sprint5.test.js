/**
 * Sprint 5 ユニットテスト（サマリー拡充・共有テキスト整形）。
 *
 * settlement.ts の純粋関数を素の JS から検証するため、TS の `import` を取り除いて
 * require できる形に変換してロードする（他テストと同方式）。React Native 非依存。
 *
 * 実行: node __tests__/sprint5.test.js
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

function loadTsAsModule(absPath) {
  let src = fs.readFileSync(absPath, 'utf8');
  // 型 import 行を除去
  src = src.replace(/^import type .*$/gm, '');
  src = src.replace(/^import .*$/gm, '');
  // export キーワードを除去（関数・interface・型を素の宣言に）
  src = src.replace(/export interface [\s\S]*?\n\}/g, '');
  src = src.replace(/export type .*$/gm, '');
  src = src.replace(/^export \{[^}]*\};?$/gm, '');
  src = src.replace(/export function/g, 'function');
  // TS 型注釈をざっくり除去（: Type 部分）— シンプルな関数のみ対象
  const m = new Module(absPath, module);
  m.paths = Module._nodeModulePaths(path.dirname(absPath));
  // ts を babel なしで動かすのは難しいため、代わりに ts-strip 的に簡易トランスパイル
  return src;
}

// 簡易: settlement.ts のロジックを直接再実装せず、tsx/babel が無い環境向けに
// 主要関数のみをここで読み込んで eval する代わりに、ロジック等価の検証を行う。
// buildSettlementText / computeMemberSpending は computeSettlement に依存するため、
// settlement.ts を TypeScript ストリップしてロードする。
const ts = require('typescript');
const settlementPath = path.resolve(__dirname, '../src/utils/settlement.ts');
let tsSrc = fs.readFileSync(settlementPath, 'utf8');
// '@/types' の import を除去（型のみ）
tsSrc = tsSrc.replace(/^import type .*$/gm, '');
const jsOut = ts.transpileModule(tsSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText;

const sandboxModule = { exports: {} };
const fn = new Function('module', 'exports', 'require', jsOut);
fn(sandboxModule, sandboxModule.exports, require);
const { computeSettlement, buildSettlementText } = sandboxModule.exports;

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

function group(members) {
  return { id: 'g1', name: '北海道旅行2026', members, createdAt: 0, updatedAt: 0 };
}
function pay(id, lenderId, amount, borrowerIds) {
  return { id, lenderId, amount, memo: '', borrowerIds, createdAt: 0 };
}

const members = [
  { id: 'm1', name: '太郎' },
  { id: 'm2', name: '花子' },
  { id: 'm3', name: '次郎' },
];

// --- 1. computeSettlement の総支出・平均（floor） ---
{
  const g = group(members);
  const payments = [pay('p1', 'm1', 3000, ['m1', 'm2', 'm3'])];
  const r = computeSettlement(g, payments);
  assert(r.total === 3000, 'total = 3000');
  assert(r.average === 1000, 'average = floor(3000/3) = 1000');
}

// --- 2. 平均の floor 検証（割り切れない） ---
{
  const g = group(members);
  const payments = [pay('p1', 'm1', 1000, ['m1', 'm2', 'm3'])];
  const r = computeSettlement(g, payments);
  assert(r.average === 333, 'average = floor(1000/3) = 333');
}

// --- 5. buildSettlementText: 基本フォーマット ---
{
  const g = group(members);
  const payments = [pay('p1', 'm2', 8000, ['m1', 'm2', 'm3'])];
  const text = buildSettlementText(g, payments);
  assert(text.includes('【Kashikari.me 精算結果】'), 'has header line');
  assert(text.includes('グループ: 北海道旅行2026'), 'has group name');
  assert(text.includes('総支出: ¥8,000'), 'has total ¥8,000');
  assert(text.includes('1人あたり: ¥2,666'), 'has average ¥2,666');
  assert(text.includes('■ 精算案'), 'has settlement section');
  // 花子が立替 → 太郎・次郎が花子へ送金
  assert(/太郎 → 花子: ¥2,6\d\d/.test(text), 'has 太郎 → 花子 transfer');
  assert(/次郎 → 花子: ¥2,6\d\d/.test(text), 'has 次郎 → 花子 transfer');
}

// --- 6. buildSettlementText: 精算不要（全員相殺） ---
{
  const g = group(members);
  const payments = [
    pay('p1', 'm1', 3000, ['m1', 'm2', 'm3']),
    pay('p2', 'm2', 3000, ['m1', 'm2', 'm3']),
    pay('p3', 'm3', 3000, ['m1', 'm2', 'm3']),
  ];
  const text = buildSettlementText(g, payments);
  assert(text.includes('みんな精算済み！貸し借りはありません'), 'shows settled message when no transfers');
  assert(text.includes('総支出: ¥9,000'), 'total still shown when settled');
}

// --- 7. buildSettlementText: 支払い0件でも落ちない ---
{
  const g = group(members);
  const text = buildSettlementText(g, []);
  assert(text.includes('総支出: ¥0'), 'total ¥0 when empty');
  assert(text.includes('みんな精算済み！'), 'empty => settled message');
}

console.log(`\nSprint 5 tests: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
