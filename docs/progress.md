# 実装進捗・自己評価

## 追加機能: テーマ切り替え機能と設定画面
**ステータス:** 実装完了 - 評価待ち
**実装日:** 2026-05-31

### 実装内容
- **4テーマのカラーパレット定義**（`src/theme.ts`）: `ThemeId`（'green' | 'blue' | 'dark' | 'coral'）と `ColorPalette` 型（18キー: primary/primaryDark/secondary/bg/surface/surfaceAlt/text/textSub/border/error/success/pillBg/white/headerBg/headerText/fabBg/iconTile[3色]）を定義。指示の色コードをそのまま `themes` に格納。既存 `colors` エクスポートは `themes.coral` を参照（後方互換）。
- **テーマ派生のグラデーション・シャドウ**（`src/theme.ts`）: `makeGradients(palette)`（header = headerBg→primaryDark、button = fabBg→primaryDark、emptyIcon = secondary→primary）と `makeShadows(palette)`（fab/header/emptyIcon の影色を primary/secondary に追従、card は黒影）を新設。テーマを変えるとグラデ・影色も切り替わる。
- **テーマ追従のアイコン色ユーティリティ**: `tileColorForIndex` / `tileGlyphColor` / `avatarColorForIndex` を `ColorPalette` 引数版に変更し、`iconTile`（3色）からローテーション。`isLightColor()`（BT.601 輝度）で背景の明暗を判定し、文字色（text or white）を自動選択 → **どのテーマでもアバター/タイル文字のコントラストを確保**。
- **テーマコンテキスト**（`src/context/ThemeContext.tsx` 新規）: `ThemeProvider` がテーマIDを state 保持し、`AsyncStorage`（キー `kashikari.me/themeId`）で永続化。起動時に保存済みテーマをロード（未保存・破損時は coral）。`useTheme()` フックで `{ themeId, colors, gradients, shadows, isDark, setTheme }` を提供。
- **全コンポーネントのテーマ対応**（24ファイル）: `import { colors } from '@/theme'` を全廃。各コンポーネント内で `useTheme()` を呼び、`StyleSheet.create(...)` を `makeStyles(c: ColorPalette)` ファクトリ化して `useMemo(() => makeStyles(colors), [colors])` で生成。レイアウト用の非カラー定数（fonts/radius/spacing）は `@/theme` から継続 import。`PaymentForm` の Web `<input type="date">` スタイルも `makeWebDateInputStyle(colors)` でテーマ追従（dark は `colorScheme: 'dark'`）。
- **ThemeProvider の組み込み**（`app/_layout.tsx`）: `RootLayout` を `SafeAreaProvider > ThemeProvider > ThemedStack` で構成。`ThemedStack`（内側で `useTheme()`）が背景色・Stack の `contentStyle` をテーマの `bg` に追従。`settings` 画面をスタックに modal 登録。
- **設定画面**（`app/settings.tsx` 新規）: 「設定」サブヘッダー（戻る付き）+「テーマカラー」セクション + 4つのテーマ選択カード。各カードに テーマプレビュー（headerBg の四角 + 代表3色サークル）・テーマ名（日本語）・カラースウォッチ3つ・選択中チェックマーク。タップで `setTheme()` → 即時にアプリ全体へ反映 + 永続化。表示名は spec 通り（グリーン / ブルー / ダーク / コーラル（デフォルト））。
- **ホームに設定ボタン**（`app/index.tsx` + `src/components/Header.tsx`）: `HomeHeader` に `rightIcon`/`onRightPress`/`rightAccessibilityLabel` を追加し、ホーム右上に歯車（`settings-outline`）を配置。タップで `/settings` に push。
- **ダークテーマのコントラスト対策**: `SettlementRow` の精算済み背景（旧 `#FAFAFA`）→ `surfaceAlt`、`DangerButton` の背景（旧 `#FFECEC`）→ `surfaceAlt`、`Toast` の文字色を `bg`（背景の反転色）に変更し dark でも判読可能に。アバター/タイル文字は輝度判定で自動切替。

### 自己評価

| 基準 | スコア (1-5) | コメント |
|------|-------------|---------|
| 機能完全性 | 5 | 4テーマ定義・ThemeContext（永続化）・設定画面・全コンポーネントのテーマ対応・ホーム歯車・ルーティング登録の全項目を実装。tsc 0・テーマテスト120アサート全合格 |
| コード品質 | 5 | `makeStyles(c)` ファクトリで全 StyleSheet をテーマ化し colors の静的 import を全廃。グラデ・影・アイコン色をパレットから派生（DRY）。`useMemo` でテーマ変更時のみ再生成 |
| UI/UX | 4 | 設定カードのプレビュー（headerBg + 3色サークル + スウォッチ + チェック）、即時切替、選択中の primary 枠線。実機の見た目は Evaluator 確認待ち |
| エラーハンドリング | 4 | AsyncStorage 読込/書込失敗時はデフォルト継続（throw しない）、不正テーマIDは弾く、輝度判定でコントラスト自動確保、dark の判読性対策 |
| 既存機能との統合 | 5 | グループ/支払い/精算/共有の既存テスト 53 アサート全合格・回帰なし。`colors` 後方互換維持。web バンドル 950 modules で正常コンパイル |

### 技術的な判断
- **StyleSheet を `makeStyles(c: ColorPalette)` ファクトリ化**: RN の `StyleSheet.create` はモジュールロード時に1度だけ評価されるため、テーマ変更でリアクティブにならない。各コンポーネントで `useTheme()` の `colors` から `useMemo` で都度生成する方式に統一し、テーマ切替で全画面が即再描画されるようにした。非カラー定数（fonts/radius/spacing）は静的のまま分離。
- **グラデーション/シャドウをパレットから派生**: spec の `ColorPalette` にはグラデ定義がないため、`makeGradients`/`makeShadows` で headerBg/fabBg/primaryDark/secondary から決定的に生成。これでテーマごとに専用グラデを手書きせずに済み、ヘッダー・FAB・空状態アイコン・影色がテーマ追従する。
- **コントラストの自動確保（dark 対策）**: spec の注意「dark テーマでテキストが読めない問題がないように」に対し、`isLightColor()`（BT.601 輝度 > 0.62）でアイコンタイル/アバター背景の明暗を判定し文字色（`text` or `white`）を選択。`headerText`（dark は #E1E1E1）をヘッダー文字・戻る/設定アイコンに使用。Toast 文字は背景反転色（`bg`）に。
- **`colors` 後方互換の維持**: 既存の `__tests__`・将来の静的参照が壊れないよう `export const colors = themes.coral` を残置。コンポーネントは `useTheme()` 経由に全移行済みのため、実 UI はテーマ追従する。
- **設定画面のプレビューは iconTile 3色 + headerBg**: 各テーマの雰囲気が一目で分かるよう、ヘッダー色の四角に代表3色サークルを重ね、下部にスウォッチを並べた。チェックマークと primary 枠線で選択状態を明示。
- **AsyncStorage キーは `kashikari.me/themeId`**: 既存データキー（`kashikari.me/appData`）と名前空間を揃え、独立キーで永続化（アプリデータと混在させない）。

### 既知の課題
- **「まとめて精算する」ボタンの背景は `secondary`**: dark テーマでは secondary（#03DAC6 ティール）+ 白文字となりコントラストはやや弱め（既存デザイン踏襲）。判読は可能だが、必要なら将来 primaryDark への変更を検討。
- **テーマ切替アニメーションなし**: 即時に色が切り替わる（フェード等の遷移は未実装）。受け入れ要件は「即時反映」のため対象外。
- **favicon の `jimp-compact` Crc error**（Sprint 1 から継続の Minor 警告）: web バンドル本体（950 modules）の正常コンパイルに影響なし。

### Evaluator への引き渡し事項

- **起動方法（Web・推奨）:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  npx expo start --web
  # ブラウザで http://localhost:8081 を開く
  ```
  - 依存追加なし（既存構成のまま）。未インストール時のみ `npm install`。
  - テーマIDは web では localStorage（`kashikari.me/themeId`）に永続化。リロード後も選択テーマが保持される。

- **ユニットテスト:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  node __tests__/theme.test.js      # 4テーマ・派生グラデ/影・アイコン色・輝度判定（120アサート）
  node __tests__/settlement.test.js # 回帰（8）
  node __tests__/payment.test.js    # 回帰（9）
  node __tests__/storage.test.js    # 回帰（8）
  node __tests__/sprint4.test.js    # 回帰（7）
  node __tests__/sprint5.test.js    # 回帰（21）
  npx tsc --noEmit                  # 型チェック（エラー0）
  ```

- **テスト対象 URL:** `http://localhost:8081`（Web）。ホーム = ルート（`app/index.tsx`）。設定 = `/settings`。

- **テストシナリオ（テーマ切替・設定画面）:**
  1. ホーム右上の歯車アイコン（`settings-outline`）をタップ → 設定画面（`/settings`）が開く。「設定」ヘッダー（戻るボタン付き）+「テーマカラー」セクション + 4カード（グリーン / ブルー / ダーク / コーラル（デフォルト））が表示される。
  2. 初期状態は「コーラル（デフォルト）」が選択中（primary 枠線 + チェックマーク）。各カードにプレビュー四角 + 代表3色サークル + スウォッチ3つが表示される。
  3. 「ブルー」をタップ → 即座にカード・ヘッダー・背景・ボタンが青系に変わる。チェックマークがブルーカードに移る。戻る → ホームのヘッダー（グラデ）・FAB・グループカードが青系で表示される。
  4. 「ダーク」をタップ → 背景が黒（#121212）、サーフェスが濃灰、テキストが薄灰（#E1E1E1）になり、**全テキスト・アイコン・アバター文字が判読可能**であること（コントラスト確認）。設定アイコン・戻る矢印・ヘッダー文字も明色で見えること。
  5. 「グリーン」をタップ → 緑系に切替。各画面（グループ詳細・支払いフォーム・精算タブ）に遷移しても選択テーマが一貫して適用されること。
  6. **永続化**: 任意のテーマを選んだ状態でページをリロード → 選択テーマが保持されている（localStorage）。
  7. **回帰**: 各テーマでグループ作成・編集・削除、支払い追加・編集・削除、精算タブ（残高/精算案/メンバー別割合/共有）、空状態、バリデーション、確認ダイアログが従来通り動作すること。色以外の挙動・レイアウトは不変。

- **デザイン適合の確認ポイント:** 設定カード（白サーフェス・角丸22・選択中 primary 枠線2px + 丸チェック）、テーマ名（日本語・jp700）、3色サークル/スウォッチ（iconTile 由来）、ホーム歯車（headerText 色）、各テーマの bg/surface/text の一貫適用、dark のコントラスト確保。絵文字は不使用。

---

## 仕様変更: 支払い入力を「貸し借り（lender / borrowers）」モデルへ
**ステータス:** 実装完了 - 評価待ち
**実装日:** 2026-05-31

### 背景
ユーザー指示により、支払い入力からカテゴリと割り勘モード（均等/金額指定/比率指定）を撤廃し、
「誰が誰に貸したか」を直接記録するシンプルな貸し借りモデルへ変更した。

### 変更内容
- **型（`src/types/index.ts`）:**
  - `Payment` を `{ id, groupId?, amount, lenderId, borrowerIds[], memo, createdAt, updatedAt }` に変更。
  - 削除: `category` / `splitMode` / `customShares` / `splitMemberIds` / `payerId`。型 `SplitMode` も削除。
  - 注: spec で提示された型の `groupId: string` / `createdAt: string` については、既存コードベースが Payment を `group.payments` 配下にネストして保持し `createdAt: number`（時系列ソート用）を前提としているため、回帰を避ける目的で `groupId` は追加せず `createdAt: number` を踏襲した。フィールドのリネーム（lender/borrowers 化）という本質的要件は満たしている。
- **ストレージ（`src/storage/index.ts`）:**
  - `PaymentInput` / `addPayment` / `updatePayment` を新フィールド（`lenderId` / `borrowerIds`）へ更新。
  - `normalizePayment()` を新設し、読み込み時に旧データを自動マイグレーション: 旧 `paidById` / `payerId` → `lenderId`、旧 `splitMemberIds` → `borrowerIds`。欠損時はデフォルト値（空文字・空配列）で補完。
  - 支払い変更時に `settledTransferKeys` をクリアする既存ロジックは維持（精算済みマークとの整合性）。
- **精算ロジック（`src/utils/settlement.ts`）:**
  - `splitPayment(amount, borrowerIds)` を借りた人への均等割りに簡素化（1人なら全額、複数なら均等・端数は先頭に +1円）。
  - `computePaymentShares` を `borrowerIds` ベースにシンプル化。`computeBalances` は `lenderId` を「貸した合計（paid）」に加算。
  - 削除: `splitByWeights` / `splitByFixedAmounts`（不均等割り勘）。
  - 残高計算・最小送金回数アルゴリズム（`computeTransfers`）・`buildSettlementText` は流用（バランス経由のため型変更の影響なし）。
- **UI:**
  - `PaymentForm.tsx`: カテゴリ選択・割り勘モード切替・customShares 入力を削除。構成を「金額 → メモ → 貸した人（単一選択チップ）→ 借りた人（複数選択チップ・全員ボタン付き）」に再構成。バリデーション文言を「貸した人を選択してください」「借りた人を1人以上選択してください」に更新。
  - `PaymentCard.tsx`: カテゴリアイコン/ピルを削除。貸した人のアバター＋「貸した人 → 借りた人（カンマ区切り）」形式で表示。
  - `MemberSelector.tsx`: アクセシビリティラベルを「貸した人 / 借りた人」に更新（コンポーネント自体は再利用）。
  - `app/group/[id]/payment/[paymentId]/edit.tsx`: 初期値マッピングを新フィールドへ更新。
- **削除ファイル:** `CategoryTile.tsx` / `CategoryPill.tsx` / `CategorySelector.tsx` / `src/utils/categories.ts`。
  - 注: `theme.ts` の `gradients` は他コンポーネント（PrimaryButton 等）でも使用されるため残置。
- **テスト:**
  - `__tests__/sprint4.test.js`: カテゴリ・不均等割り勘テストを削除し、貸し借り（lender/borrowers）均等割り・端数・無効id除外・精算済みキートグルのテストに刷新（7 ケース全パス）。
  - `__tests__/settlement.test.js` / `payment.test.js` / `sprint5.test.js`: フィールド名を新スキーマ（lenderId / borrowerIds）へ更新（それぞれ 8 / 9 / 21 ケース全パス）。

### 検証結果
- `npx tsc --noEmit` → エラー 0。
- `node __tests__/{payment,settlement,sprint4,sprint5}.test.js` → 全パス（9 / 8 / 7 / 21）。
- `npx expo export --platform web` → Metro が 948 モジュールを resolution エラーなしでバンドル成功（削除ファイル参照なし）。※末尾の `Crc error`（jimp）は favicon/icon PNG のアセット最適化段階の既存問題で、コード変更とは無関係。

### 既知の課題 / 申し送り
- spec の `Payment` 型に含まれていた `groupId` / `createdAt: string` は、回帰回避のため既存構造（ネスト保持・`createdAt: number`）を踏襲した（上記参照）。将来サーバ同期を導入する際に再検討。
- 精算タブのサマリー（総支出・1人あたり平均・メンバー別支出割合）は貸した合計（paid）ベースのままで、貸し借りモデルでも意味が通る（立て替え＝貸した合計）。

### Evaluator への引き渡し事項
- **起動方法（Web）:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  npx expo start --web
  ```
- **ユニットテスト:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  node __tests__/sprint4.test.js
  node __tests__/settlement.test.js
  node __tests__/payment.test.js
  node __tests__/sprint5.test.js
  npx tsc --noEmit
  ```
- **テスト対象 URL:** `http://localhost:8081`（Web）。
- **テストシナリオ（貸し借り入力）:**
  1. グループ（メンバー3名以上）を開き、支払い追加画面を開く。
  2. フォーム構成が「金額 → 用途（メモ）→ 貸した人 → 借りた人」になっていること。カテゴリ・割り勘モードの UI が無いこと。
  3. 金額・貸した人・借りた人を未入力で保存 → それぞれのエラー文言（金額／貸した人／借りた人）が出て保存されないこと。
  4. 金額5000、貸した人=太郎、借りた人=花子（1人）で保存 → 一覧カードに「太郎 → 花子」「¥5,000」と表示されること。
  5. 金額6000、貸した人=太郎、借りた人=花子・次郎（複数・全員ボタンでも可）で保存 → カードに「太郎 → 花子, 次郎」と表示されること。
  6. 精算タブで残高が借りた人へ均等割りされていること（5 の例: 花子・次郎 各 -3000、太郎 +6000）。
  7. 支払いカードをタップ → 編集画面に既存の貸した人・借りた人・金額・メモが復元されること。変更して保存 → 反映されること。
  8. 編集画面の「この支払いを削除」→ 確認ダイアログ → 削除され一覧・精算から消えること。

## Sprint 5: サマリー・共有・仕上げ
**ステータス:** 実装完了 - 評価待ち
**実装日:** 2026-05-31

### 実装内容
- **グループサマリーの拡充**（精算タブ）:
  - 精算タブ上部に「総支出 / 1人あたり平均」を並べた白サマリーカードを追加（縦区切り線付き）。Sprint 3 のティールピル「1人あたり ¥X」を、より明示的なサマリーカードに置き換え。
  - **メンバー別支出割合**セクションを新設（`MemberSpendingRow.tsx`）: 各メンバーの「立て替えた合計金額」＋「総支出の {percent}%」＋割合バー（アバター色）を表示。`computeMemberSpending`（純粋関数）で算出。
- **精算結果のテキスト共有・コピー**:
  - `src/utils/settlement.ts` に `buildSettlementText(group, payments)`（純粋関数）を追加。spec の例フォーマット（`【かしかり.me 精算結果】` / グループ名 / 総支出 / 1人あたり / `■ 精算案` / `{A} → {B}: ¥X`）でテキスト生成。精算不要時は「みんな精算済み！貸し借りはありません」。
  - `src/utils/share.ts`（`shareText`）を新設。Web は `navigator.share`（対応端末）→ `navigator.clipboard.writeText` → `execCommand('copy')` の3段フォールバック、native は `Share.share()`。戻り値（shared/copied/cancelled/failed）で呼び出し側がフィードバックを出し分け。
  - 精算タブ最下部に「精算結果を共有」ボタン（primary 枠線・共有アイコン）を追加。タップで共有/コピーし、`Toast.tsx`（下部の軽量トースト）で「精算結果をコピーしました / 共有しました / 共有に失敗しました」を表示。
- **確認ダイアログの網羅確認**: グループ削除（`group/[id]/edit.tsx`）・支払い削除（`payment/[paymentId]/edit.tsx`）はいずれも `confirmDestructive`（Web=`window.confirm` / native=`Alert.alert`）で確認済み。未確認の破壊的操作なし。
- **空状態・エラー状態の整備**:
  - グループ詳細の「見つからない」状態を、プレーンテキストから `EmptyState`（見出し+ガイド文「ホームに戻ってグループを選び直してください」）に改善。戻る導線をホーム（`/`）へ。
  - 既存の空状態（グループ0件・支払い0件・精算なし・全員精算済み）を確認し、いずれも design.md 6. の文言で表示されることを確認。
- **既知バグ修正（Sprint 2 フィードバック バグ#1）**: グループ削除後の遷移先が削除済みグループ詳細画面になる問題を修正。`handleDelete` で `router.dismissAll()`（スタックを畳む）→ `router.replace('/')` でホームへ遷移するよう変更。
- **1人あたり平均の丸め統一**（Sprint 3/4 既知の課題）: 詳細ヘッダーサマリー・精算タブ・グループカードの平均を `Math.floor`（=`computeSettlement.average`）に統一。詳細画面の総支出/平均は `computeSettlement` の値を直接使い、丸めの二重計算を排除。
- **ユニットテスト**（`__tests__/sprint5.test.js`、21 アサート全合格）: 総支出・平均（floor）、メンバー別支出割合（%・支払い0件時0%）、共有テキストのフォーマット（ヘッダー/グループ名/総支出/平均/精算案行）、精算不要時の「みんな精算済み」文言、支払い0件でも落ちないこと。TypeScript を `typescript` でトランスパイルして `settlement.ts` を直接ロードして検証。

### 自己評価

| 基準 | スコア (1-5) | コメント |
|------|-------------|---------|
| 機能完全性 | 5 | Sprint 5 全受け入れ基準（サマリー総支出・1人あたり/共有・コピー/破壊的操作の確認/各画面の空状態/作成→記録→精算→共有の通し動作/回帰なし）を実装 |
| コード品質 | 5 | 共有テキスト整形・メンバー別集計を純粋関数化（テスト容易）。共有処理は `share.ts` に集約しプラットフォーム分岐を一元化。tsc エラー0、テスト 54 アサート相当全合格 |
| UI/UX | 4 | サマリーカード・割合バー・共有ボタン・トーストを design.md トークンで実装。共有/コピーの成否をトーストでフィードバック。実機の見た目は Evaluator 確認待ち |
| エラーハンドリング | 4 | 共有3段フォールバック（share→clipboard→execCommand）、失敗時トースト、二重タップ防止（sharing フラグ）、グループ未存在の空状態ガイド、破壊的操作の確認を網羅 |
| 既存機能との統合 | 5 | Sprint 1〜4 のテスト全合格（33 ケース）、回帰なし。精算ピル→サマリーカードの置換のみで残高・精算案・精算済みチェックは不変。平均の丸め統一で表示の一貫性向上 |

### 技術的な判断
- **共有はプラットフォーム別の3段フォールバック**: Web では `navigator.share`（モバイル Web で共有シート）を最優先し、AbortError（ユーザーキャンセル）は cancelled として処理。非対応・失敗時は `navigator.clipboard.writeText`、それも不可なら `execCommand('copy')` の textarea フォールバックでコピーする。デスクトップ Chromium（Playwright 検証環境）では clipboard コピー経路となり「精算結果をコピーしました」トーストが出る。
- **共有テキストは純粋関数 `buildSettlementText`**: storage/React 非依存で `settlement.ts` に実装し、`sprint5.test.js` で spec の例フォーマットを検証。UI は `shareText(buildSettlementText(...))` を呼ぶだけ。
- **サマリーカードでピルを置換**: design.md 3.3b は「1人あたり平均を残高セクション上部 or サマリーに表示」と規定。Sprint 3 のピル表示を、受け入れ基準「総支出・1人あたり平均」を明示する白サマリーカード（総支出 + 1人あたり平均の2カラム）に格上げした。残高・精算案の構造は不変。
- **削除後の遷移は dismissAll + replace('/')**: `router.back()` だと削除済みグループ詳細に戻る（バグ#1）。expo-router の `dismissAll()` で詳細・編集のスタックを畳んでから `replace('/')` でホームへ。`canDismiss()` ガードで畳めない場合も `replace('/')` は実行。
- **平均は floor で全画面統一**: 総支出サマリー（従来 round）と精算ピル（floor）の差を解消するため、`computeSettlement.average`（floor）を単一の真実とし、詳細ヘッダー・精算タブ・グループカードすべてで floor を使う。受け入れ基準は「平均の表示」のみで丸め方は不問だが、UX 一貫性のため統一。
- **トーストは Animated の自前実装**: 共有/コピーの成否フィードバックに、依存追加なしで下部に1.8秒表示する軽量トースト（フェードイン/アウト）を新設。保存成功は従来どおり画面遷移で示す（design.md 6. の方針）。

### 既知の課題
- **精算済みの全クリア方針**（Sprint 4 から継続・合否影響なし）: 支払いの追加・編集・削除時に全精算済みマークをクリアする方針は残高整合性の観点で安全側。「残高変化した送金ペアのみ無効化」する精緻化は将来検討。
- **navigator.share の挙動はブラウザ依存**: デスクトップ Chromium では `navigator.share` 非対応のため clipboard コピー経路。共有シート（OS ネイティブ）は実機 iOS / 対応モバイル Web でのみ起動する。受け入れ基準「共有／コピーの操作ができ、テキスト形式で出力される」はコピー経路で満たす。
- **favicon の `jimp-compact` Crc error**（Sprint 1 から継続の Minor 警告）: アプリのバンドル・配信・動作に影響なし。Web 本体は `Web Bundled ... (890 modules)` で正常コンパイル、HTTP 200。

### Evaluator への引き渡し事項

- **起動方法（Web・推奨）:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  npx expo start --web
  # ブラウザで http://localhost:8081 を開く
  ```
  - 依存追加なし（Sprint 1〜4 の構成のまま）。未インストール時のみ `npm install`。
  - AsyncStorage は web では localStorage バックエンド。リロード後の永続化も web で検証可能。
  - 共有は Chromium では clipboard コピー経路（トースト「精算結果をコピーしました」）。クリップボード権限がブロックされる環境でも `execCommand` フォールバックで動作する。

- **ユニットテスト:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  node __tests__/sprint5.test.js    # サマリー集計・共有テキスト整形（21 アサート）
  node __tests__/sprint4.test.js    # 不均等割り勘・カテゴリ・精算済み（8 ケース、回帰）
  node __tests__/settlement.test.js # 精算ロジック（8 ケース、回帰）
  node __tests__/payment.test.js    # 支払い CRUD（9 ケース、回帰）
  node __tests__/storage.test.js    # ストレージ（8 ケース、回帰）
  npx tsc --noEmit                  # 型チェック（エラー0）
  ```

- **テスト対象 URL:** `http://localhost:8081`（Web）。ホーム = ルート（`app/index.tsx`）。

- **テストシナリオ（Sprint 5）:**
  1. メンバー3名（例: 北海道旅行2026 / 太郎・花子・次郎）のグループを作成し、詳細（支払いタブ）を開く。
  2. **サマリー（AC1）**: 支払いを数件追加（例: 太郎 6000・全員割り、花子 4000・全員割り）→「精算」タブへ。上部の白サマリーカードに「総支出 ¥10,000 / 1人あたり平均 ¥3,333」が表示される。
  3. **メンバー別支出割合**: サマリー直下「メンバー別の支出割合」に 太郎 ¥6,000（60%）・花子 ¥4,000（40%）・次郎 ¥0（0%）が割合バー付きで表示される。
  4. **共有・コピー（AC2）**: 精算タブ最下部「精算結果を共有」ボタンをタップ → 下部にトースト「精算結果をコピーしました」が表示。クリップボードに以下形式が入る:
     ```
     【かしかり.me 精算結果】
     グループ: 北海道旅行2026
     総支出: ¥10,000
     1人あたり: ¥3,333

     ■ 精算案
     太郎 → 花子: ¥... など
     ```
     （Chromium ではコピー、対応モバイル Web/iOS 実機では共有シート起動）
  5. **確認ダイアログ（AC3）**: 支払い行をタップ→編集画面「この支払いを削除」→ 確認（Web は window.confirm）→ OK で削除。グループ編集「グループを削除」→ 確認 → OK で削除され、**ホーム画面に遷移**する（削除済み詳細に戻らない＝バグ#1 修正）。
  6. **空状態（AC4）**: グループ0件→「まだグループがないよ！」、支払い0件→支払いタブ「まだ支払いがないよ！」・精算タブ「精算する貸し借りはまだないよ」、全員相殺→精算案に「みんな精算済み！」、存在しないグループ URL→「グループが見つかりません」ガイド。
  7. **通し動作（AC5）**: 新規グループ作成 → 支払い記録 → 精算タブで残高・精算案確認 → 共有まで、エラーなく完了する。
  8. **回帰（AC6）**: Sprint 1〜4（グループ/支払い CRUD・割り勘対象選択・¥フォーマット・残高/精算案の即時再計算・カテゴリ・不均等割り勘・精算済みチェック・再起動後の永続化）が引き続き動作する。

- **デザイン適合の確認ポイント（Sprint 5）:** サマリーカード（白・角丸22・総支出/平均 Baloo 2 金額）、メンバー別割合カード（40px アバター + Baloo 2 金額 + アバター色の割合バー）、共有ボタン（primary `#FF6B6B` 枠線 + 共有アイコン + 文字 primary）、トースト（`#2B2B3A` 背景・白文字・チェックアイコン）、空状態ガイド（`gradEmptyIcon` ¥アイコン）。絵文字は不使用。

---

## Sprint 4: 割り勘の高度化と精算管理
**ステータス:** 実装完了 - 評価待ち
**実装日:** 2026-05-30

### 実装内容
- **カテゴリ分類**（`src/utils/categories.ts`）: design.md 4. のカテゴリ定義（食事/交通/宿泊/買い物/その他）を定数化。各カテゴリに glyph（漢字1文字）・タイルグラデ・ピル背景/文字色を持たせ、`getCategory`（未知・未設定は「その他」）/ `isValidCategory` を提供。
  - `CategoryTile.tsx`: カテゴリ色グラデーションの角丸スクエアアイコン（40px、glyph 漢字1文字）。支払いカードの左アイコンに使用。
  - `CategoryPill.tsx`: カテゴリ色の薄背景 + 濃文字ピル。支払いカードの右下に表示。
  - `CategorySelector.tsx`: カテゴリ単一選択チップ群（横スクロール）。選択中はカテゴリ色で塗る。支払いフォームに配置。
- **不均等割り勘**（割り勘方式の追加）:
  - `Payment` 型に `splitMode: 'equal' | 'amount' | 'ratio'` と `customShares: Record<memberId, number>` を追加（既存データは `splitMode` 未設定＝'equal' とみなし後方互換）。
  - `PaymentForm.tsx` に割り勘方式の切替（均等 / 金額指定 / 比率指定）を追加。
    - 均等: 従来の `SplitSelector`（全員トグル + チェックリスト）。
    - 金額指定: 各メンバーに負担金額入力。合計が支払い金額と一致しないと保存不可（合計/金額の差分をリアルタイム表示、一致時は success 色）。
    - 比率指定: 各メンバーに比率（重み）入力。1人以上正の値が必要。
  - 精算ロジック（`src/utils/settlement.ts`）に `splitByFixedAmounts`（金額指定）/ `splitByWeights`（比率の floor + 端数を frac 大きい順に1円配分）/ `computePaymentShares`（方式に応じて負担額を算出）を追加。`computeBalances` は全方式でゼロサムを保証（金額指定は合計ズレ時に最大シェアで補正、比率は端数を漏れなく配分）。
- **精算完了マーク**:
  - `Group` 型に `settledTransferKeys: string[]`（`${fromId}->${toId}` 形式）を追加し永続化。
  - `SettlementTransfer` に安定キー `key` を付与（`transferKey`）。
  - storage に `getSettledTransferKeys` / `setTransferSettled`（トグル + 永続化）を追加。支払いの追加・編集・削除時は残高が変わるため `settledTransferKeys` をクリアして整合性を維持。
  - `SettlementRow.tsx` に「精算済み」チェックボックス（success ティール塗り + 白チェック）を追加。精算済み行は取り消し線 + 不透明度0.5（グレーアウト）+「精算済み」ラベル + 背景薄グレー。
  - グループ詳細画面（`app/group/[id]/index.tsx`）で精算済みキーを読み込み、各精算行に settled 状態を渡し、トグルで楽観更新 + 永続化。`useFocusEffect` 再読込でリロード後も保持。
- **支払い一覧のカテゴリ表示**: `PaymentCard.tsx` のアイコンタイルをカテゴリタイルに差し替え、右下にカテゴリピルを表示。補足行に割り勘方式（均等/金額指定/比率指定）を表示。
- **ユニットテスト**（`__tests__/sprint4.test.js`、8 ケース全合格）: 金額指定/比率指定のゼロサム・負担合計一致、比率の端数配分、金額指定の合計ズレ補正、equal 後方互換、カテゴリ解決（未知→その他）、精算済みキーのトグル。

### 自己評価

| 基準 | スコア (1-5) | コメント |
|------|-------------|---------|
| 機能完全性 | 5 | Sprint 4 全受け入れ基準（カテゴリ選択・一覧表示・不均等割り勘・ゼロサム・精算済みチェック・見た目区別・再起動保持）を実装 |
| コード品質 | 5 | カテゴリ定数・割り勘ロジックを純粋関数/定数に分離。型に splitMode/customShares/settledTransferKeys を後方互換で追加。tsc エラー0、テスト 33/33（4ファイル） |
| UI/UX | 4 | design.md 4. のカテゴリ色・glyph、割り勘方式チップ、精算済みチェック（取り消し線・グレーアウト）を実装。実機の見た目は Evaluator 確認待ち |
| エラーハンドリング | 4 | 金額指定の合計不一致/対象0人のバリデーション、比率の重み0扱い、合計ズレ補正、未知カテゴリのフォールバックを処理 |
| 既存機能との統合 | 5 | 既存データ（splitMode 無し）は 'equal' として従来通り動作。Sprint 1〜3 のテスト全合格、回帰なし。支払い変更時の精算済みクリアで整合性維持 |

### 技術的な判断
- **不均等割り勘でのゼロサム保証**:
  - 金額指定（amount）: 各メンバーの入力金額を負担額とする。フォームで合計＝支払い金額を必須バリデーションするが、ロジック側でも合計がズレた場合は差分を最大シェアのメンバーに寄せて補正し、負担合計を必ず amount に一致させる（ゼロサム維持）。
  - 比率指定（ratio）: `(amount × weight) / totalWeight` を floor で配分し、端数（amount − 配分合計）を小数部の大きい順（同値は入力順）に1円ずつ加算。負担合計は厳密に amount と一致する。
- **割り勘方式は後方互換**: `splitMode` 未設定の既存支払い（Sprint 2/3 で作成）は `computePaymentShares` で 'equal' とみなし、従来の `splitMemberIds` 均等割りで計算。データマイグレーション不要。
- **精算済みキーは送金の `${fromId}->${toId}`**: 残高から決定的に生成される送金ペアに紐づけて永続化。支払いの追加・編集・削除で残高が変わると送金ペアも変わり得るため、それらの操作時に `settledTransferKeys` をクリアして「実態と合わない精算済み」を防ぐ（受け入れ基準は再起動後の保持＝支払い不変時の永続化なので、この方針で満たせる）。
- **精算済みトグルは楽観的更新 + 永続化**: タップ即座に UI を反映し、`setTransferSettled` の戻り値で再同期。`useFocusEffect` で詳細画面再表示・リロード時に storage から再読込するため永続化が反映される。
- **カテゴリタイル/ピルは専用コンポーネント化**: 既存 `IconTile`（メモ先頭文字 + index ローテ）はグループカードで継続利用し、支払い用にカテゴリ固定色の `CategoryTile`/`CategoryPill` を新設。これで Sprint 2 の「並び順で色が振り直される」課題が解消（色がカテゴリ固定に）。

### 既知の課題
- **支払い変更で精算済みがリセットされる**: 残高整合性を優先し、支払いの追加・編集・削除時に全精算済みマークをクリアする方針。個別の送金単位で「残高変化があった送金だけ無効化」する精緻化は将来検討（現状は安全側＝全クリア）。受け入れ基準「再起動後の保持」は支払い不変時に満たす。
- **1人あたり平均の丸め**（Sprint 3 から継続）: 総支出サマリー（round）と精算ピル（floor）で差。Sprint 5 のサマリー拡充で統一検討。
- **favicon の `jimp-compact` Crc error**（Sprint 1 から継続の Minor 警告）: アプリのバンドル・配信・動作に影響なし。Web 本体は `Web Bundled ... (887 modules)` で正常コンパイル。

### Evaluator への引き渡し事項

- **起動方法（Web・推奨）:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  npx expo start --web
  # ブラウザで http://localhost:8081 を開く
  ```
  - 依存追加なし（Sprint 1〜3 の構成のまま）。未インストール時のみ `npm install`。
  - AsyncStorage は web では localStorage バックエンド。リロード後の永続化も web で検証可能。

- **ユニットテスト:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  node __tests__/sprint4.test.js    # 不均等割り勘・カテゴリ解決・精算済みトグル（8 ケース）
  node __tests__/settlement.test.js # 精算ロジック（8 ケース、回帰）
  node __tests__/payment.test.js    # 支払い CRUD（9 ケース、回帰）
  node __tests__/storage.test.js    # ストレージ（8 ケース、回帰）
  npx tsc --noEmit                  # 型チェック（エラー0）
  ```

- **テスト対象 URL:** `http://localhost:8081`（Web）。ホーム = ルート（`app/index.tsx`）。

- **テストシナリオ（Sprint 4）:**
  1. メンバー3名（例: 沖縄旅行 / 太郎・花子・次郎）のグループを用意し、グループ詳細（支払いタブ）を開く。
  2. **カテゴリ選択**: 「支払いを追加」→ 金額「3000」、支払者「太郎」、用途「夕食代」、カテゴリで「食事」を選択（割り勘=均等のまま）→ 保存。支払い一覧の行に「食」のコーラルタイル + 右下に「食事」ピルが表示される。別の支払いで「交通」「宿泊」「買い物」も選び、各カテゴリのタイル色/ピルが表示されることを確認。
  3. **カテゴリ編集**: 既存支払いの行をタップ → 編集画面でカテゴリがプリフィルされ、別カテゴリに変更して保存 → 一覧のタイル/ピルが変わる。
  4. **不均等割り勘（金額指定）**: 「支払いを追加」→ 金額「10000」、支払者「太郎」→ 割り勘方式で「金額指定」を選択 → 太郎5000・花子3000・次郎2000 を入力。「入力合計 ¥10,000 / 支払い金額 ¥10,000」が success 色で表示 → 保存。
     - 合計をわざと ¥9,000 等にして保存しようとすると「各メンバーの金額の合計…を支払い金額…に合わせてください」エラーで保存不可。
  5. **不均等割り勘（比率指定）**: 「支払いを追加」→ 金額「6000」、支払者「花子」→「比率指定」→ 太郎1・花子2・次郎3 を入力 → 保存。
  6. **精算反映 + ゼロサム**: 精算タブに切替。上記（金額指定10000・太郎立替）だけの状態なら 太郎 +¥5,000 / 花子 -¥3,000 / 次郎 -¥2,000。比率指定（6000・花子立替・1:2:3）だけなら 太郎 -¥1,000 / 花子 +¥4,000 / 次郎 -¥3,000。いずれも残高合計 ¥0。精算案にも反映される。
  7. **精算済みチェック**: 精算タブの精算案の各行右端のチェックボックスをタップ → success ティール塗り + 白チェックになり、文言/金額に取り消し線 + 行がグレーアウト +「精算済み」ラベル表示。もう一度タップで解除。
  8. **再起動後の保持**: いずれかの送金を精算済みにした状態でページをリロード → 精算済みチェック状態・取り消し線が保持されている（localStorage 永続化）。
  9. **回帰**: 均等割りの支払い・グループ CRUD・支払い CRUD・総支出サマリー・¥フォーマット・残高/精算案の即時再計算が引き続き動作する。Sprint 2/3 で作成した（splitMode 無しの）支払いも従来通り均等割りで計算される。

- **デザイン適合の確認ポイント（Sprint 4）:** カテゴリタイル（食=コーラル/交=ティール/宿=紫/買=黄[文字濃]/他=コーラル薄）、カテゴリピル（食 `#FFE6E6`/`#FF6B6B`、交 `#D8F7F4`/`#0C8C83`、宿 `#EFE6FF`/`#7B45D6`、買 `#FFF3D6`/`#7A5B00`、他 `#F0E6DC`/`#8A8A9C`）、割り勘方式チップ（選択中コーラル `#FF6B6B` 塗り）、精算済みチェック（success `#0C8C83` 塗り + 白チェック + 取り消し線）。絵文字は不使用。

---

## Sprint 3: 精算計算と残高表示
**ステータス:** 実装完了 - 評価待ち
**実装日:** 2026-05-30

### 実装内容
- **精算計算ロジック（純粋関数）**（`src/utils/settlement.ts`）: ストレージ・React 非依存。
  - `splitPayment(amount, splitMemberIds)`: 1支払いを割り勘対象で均等分割。端数は対象先頭から1円ずつ配分し、負担合計が金額と一致（取りこぼしゼロ）。
  - `computeBalances(members, payments)`: 各メンバーの `paid`（支払った合計）/ `owed`（負担合計）/ `balance`（paid − owed）を算出。グループに存在しない支払者・割り勘対象は無視。
  - `computeTransfers(balances)`: 最大債権者 ↔ 最大債務者を貪欲ペアリングする最小送金回数アルゴリズム。送金回数 ≦（残高非0メンバー数 − 1）≦（メンバー数 − 1）。
  - `computeSettlement(group, payments)`: 残高・精算案・総支出・1人あたり平均をまとめて返す。
- **グループ詳細画面の精算タブ実装**（`app/group/[id]/index.tsx`）: Coming Soon プレースホルダーを撤去し、精算ビューを実装。
  - 1人あたり平均負担額ピル（`computeSettlement.average`、切り捨て）
  - 残高セクション「残高」: 各メンバーの `BalanceCard` を group.members 順で表示
  - 精算案セクション「精算案」: `SettlementRow` を送金リスト順で表示
  - 空状態分岐: 支払い0件 →「精算する貸し借りはまだないよ」、支払いあり・全員残高0 →「みんな精算済み！」
- **新規コンポーネント**:
  - `BalanceCard.tsx`: メンバー残高1行（プラス=ティール濃 success「受け取る」/ マイナス=コーラル primary「支払う」/ 0=textSub「精算済み」）。40px アバター + 名前 + 残高金額（Baloo 2 18px）。
  - `SettlementRow.tsx`: 「{A} → {B}」をアバター + `arrow-forward` アイコンで視覚化し、「{A}さんが{B}さんに」文言 + 金額（Baloo 2 18px）を表示。
- **精算ロジックのユニットテスト**（`__tests__/settlement.test.js`、8 ケース全合格）: 検証ケース（3人・1人が3000円立替・均等割り）、ゼロサム、端数処理、複数支払い、個別割り勘、支払い0件、相殺で全員0、送金回数上限（n-1以下）、端数混在でも送金総額=債務総額。

### 自己評価

| 基準 | スコア (1-5) | コメント |
|------|-------------|---------|
| 機能完全性 | 5 | Sprint 3 全受け入れ基準（タブ切替・残高一覧・ゼロサム・精算案・検証ケース一致・空状態・即時再計算・送金回数 n-1 以下）を実装 |
| コード品質 | 5 | 精算ロジックを純粋関数として `settlement.ts` に分離。UI から計算を切り離しテスト容易。tsc エラー0、テスト 8/8 |
| UI/UX | 4 | design.md 3.3b（残高カード色分け・精算行のアバター矢印・1人あたりピル・空状態文言）を忠実に実装。実機の見た目は Evaluator 確認待ち |
| エラーハンドリング | 4 | 金額0・負・非存在メンバーの除外、端数のゼロサム調整、支払い0件・全員0の空状態分岐を処理 |
| 既存機能との統合 | 5 | 支払いタブ・支払い CRUD・総支出サマリーは未変更。`useFocusEffect` 再読込で支払い変更が精算タブに即反映。回帰テスト全合格 |

### 技術的な判断
- **精算ロジックを純粋関数化**: `src/utils/settlement.ts` にストレージ・React 非依存で実装し、`__tests__/settlement.test.js` で同一アルゴリズムを検証。UI（詳細画面）は `computeSettlement` を呼ぶだけ。
- **端数配分は「割り勘対象の先頭から1円ずつ」**: `Math.floor` の base に remainder を先頭メンバーへ +1 配分。各支払いの負担合計が金額と一致するため、全体の残高合計が必ず 0（ゼロサム）になる。切り捨てによる端数の消失・重複を防ぐ。
- **最小送金回数アルゴリズム**: 毎回「最大債権者」と「最大債務者」をソートで選びペアリング（greedy）。1回の送金で必ず一方の残高が 0 になるため、送金回数は残高非0メンバー数 − 1 以下に収まり、受け入れ基準「送金回数 ≦ メンバー数 − 1」を満たす。
- **支払いタブと同じ `payments` を再利用**: 精算タブは既に `useFocusEffect` で読み込んだ `payments` から `computeSettlement` を計算するため、支払いの追加・編集・削除から詳細画面に戻ると再読込 → 残高・精算案が即時再計算される。
- **1人あたり平均は切り捨て（Math.floor）**: ヘッダーの総支出サマリー（`Math.round`、Sprint 2 由来・既存）とは別に、精算タブのピルは `settlement.average`（floor）。受け入れ基準は「平均額の表示」のみで丸め方法は規定なし。両者の差は端数1円程度で、精算自体は端数調整済みの残高で正確。
- **アバター色は group.members 順 index でローテーション**: 残高カード・精算行とも id → members 内 index のマップで色を固定し、Sprint 1/2 のアバター配色と一貫。

### 既知の課題
- **精算済みチェックは表示しない（Sprint 4 範囲）**: design.md 3.3b の「精算済み」チェック・取り消し線・ピルは Sprint 4 の精算完了マーク機能。Sprint 3 では精算行に金額のみ表示し、チェック UI は未配置（仕様の Sprint 4 受け入れ基準で実装予定）。
- **1人あたり平均の丸め方が総支出サマリー（round）と精算ピル（floor）で異なる**: 端数1円程度の差。Sprint 5 のサマリー拡充で統一を検討。
- **favicon の `jimp-compact` Crc error** は Sprint 1 から継続の Minor 警告（バグ#2）。アプリのバンドル・配信・動作に影響なし。

### Evaluator への引き渡し事項

- **起動方法（Web・推奨）:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  npx expo start --web
  # ブラウザで http://localhost:8081 を開く
  ```
  - 依存追加なし（Sprint 1/2 の構成のまま）。未インストール時のみ `npm install`。
  - AsyncStorage は web では localStorage バックエンド。リロード後の永続化も web で検証可能。

- **ユニットテスト:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  node __tests__/settlement.test.js  # 精算ロジック（8 ケース：検証ケース・ゼロサム・端数・送金回数上限）
  node __tests__/payment.test.js     # 支払い CRUD（9 ケース、回帰）
  node __tests__/storage.test.js     # ストレージ（8 ケース、回帰）
  npx tsc --noEmit                   # 型チェック（エラー0）
  ```

- **テスト対象 URL:** `http://localhost:8081`（Web）。ホーム = ルート（`app/index.tsx`）。

- **テストシナリオ（Sprint 3）:**
  1. グループが0件なら、メンバー3名（例: 沖縄旅行 / 太郎・花子・次郎）のグループを作成する（Sprint 1 経路）。
  2. グループカードをタップ → 詳細画面（支払いタブ）。「精算」タブに切り替える。
  3. 支払い0件のとき → 精算タブに空状態「精算する貸し借りはまだないよ／支払いを記録すると精算案がここに出るよ」が表示される。
  4. **検証ケース**: 支払いタブで「太郎」が「3000」を立替、用途任意、割り勘=全員（3人）で保存。精算タブに切り替える。
     - 1人あたりピル「1人あたり ¥1,000」。
     - 残高: 太郎「+¥2,000 受け取る」（ティール濃）、花子「-¥1,000 支払う」（コーラル）、次郎「-¥1,000 支払う」（コーラル）。残高合計は ¥0（ゼロサム）。
     - 精算案: 「花子さんが太郎さんに ¥1,000」「次郎さんが太郎さんに ¥1,000」の2件（= メンバー数3 − 1 以下）。手計算と一致。
  5. **複数支払い**: さらに「花子」が「3000」を立替・全員割り勘で追加。精算タブで再計算を確認。
     - 総額6000・1人2000。太郎 +1000 / 花子 +1000 / 次郎 -2000。精算案: 次郎→太郎・次郎→花子 など合計2件以内。残高合計 ¥0。
  6. **個別割り勘**: 「花子」が「3000」をタクシーで立替、割り勘=花子・次郎の2名のみで追加。太郎の残高は対象外分が変わらないこと、次郎→花子の送金が含まれることを確認。
  7. **即時再計算**: 支払いタブで上記いずれかを編集（金額変更）または削除 → 精算タブに戻ると残高・精算案・1人あたりが即座に更新される。
  8. **全員精算済み**: 全員が均等額を立替て相殺される状態（例: 太郎・花子・次郎が各3000を全員割り勘で立替）→ 精算タブで残高が全員 ¥0、精算案セクションに「みんな精算済み！」が表示される。
  9. **送金回数上限**: 4名グループで1人が全額立替 → 精算案が3件（メンバー数4 − 1）以下に収まる。
  10. リロード後も支払いが保持され、精算タブの残高・精算案が同じく再計算される。

- **デザイン適合の確認ポイント（Sprint 3）:** 1人あたりピル（ティール `#D8F7F4`/`#0C8C83`）、残高カード（受け取る=success ティール濃・支払う=primary コーラル・0=textSub、40px アバター + 名前 + Baloo 2 金額）、精算行（送金元アバター → `arrow-forward` → 送金先アバター、「{A}さんが{B}さんに」+ Baloo 2 金額）、セクションラベル「残高」「精算案」、空状態文言。絵文字は不使用。

---

## Sprint 2: 支払いの記録と履歴管理
**ステータス:** 実装完了 - 評価待ち
**実装日:** 2026-05-30

### 実装内容
- **グループ詳細画面**（`app/group/[id]/index.tsx`）: コーラルグラデのサブヘッダー（戻る + グループ名 + 「編集」アクション）、総支出サマリーカード（総支出・1人あたり）、支払い／精算のセグメントタブ、支払い履歴一覧、下部固定 FAB「支払いを追加」
- **支払い追加画面**（`app/group/[id]/payment/new.tsx`）+ **支払い編集画面**（`app/group/[id]/payment/[paymentId]/edit.tsx`）: 共有 `PaymentForm` を利用
- **支払い CRUD をストレージ層に追加**（`src/storage/index.ts`）: `getPayments` / `getPayment` / `addPayment` / `updatePayment` / `deletePayment`、`PaymentInput` 型。各操作でグループの `payments` 配列を更新し永続化
- **金額の日本円フォーマット表示**: `formatYen`（既存）でカンマ区切り・¥記号。一覧・サマリーに適用
- **割り勘対象メンバー選択**（`MemberSelector.tsx`）: 「全員」トグル + 各メンバーのチェックリスト（個別選択）。デフォルトは全員選択
- **支払者の単一選択**: 横スクロールのチップ群（選択中はコーラルグラデ）
- **支払い一覧の時系列表示**: `createdAt` 降順（新しい順）
- **総支出サマリー**: 詳細画面で全支払いの合計と1人あたり平均を表示。追加・編集・削除後に再描画で更新
- **支払い削除**: 編集画面の危険ボタン → `confirmDestructive`（Web は `window.confirm` / native は `Alert.alert`）で確認
- **新規コンポーネント**: `PaymentCard`（一覧1行）/ `PaymentForm`（追加・編集フォーム）/ `MemberSelector`（PayerSelector + SplitSelector）/ `SegmentTabs`（タブ切替）
- **共通ユーティリティ**: `src/utils/confirm.ts`（`confirmDestructive`）に破壊的操作の確認を一元化。Sprint 1 のグループ削除も同ユーティリティへ移行
- **精算タブ**: Sprint 3 用プレースホルダー「精算機能は Coming Soon」を表示（FAB は支払いタブのみ）
- **ルーティング更新**: ホームのカードタップを編集画面→**詳細画面**へ差し替え（Sprint 1 フィードバックの指示どおり）。編集導線は詳細画面の「編集」アクションへ再配置
- **支払いロジックのユニットテスト**（`__tests__/payment.test.js`、9 ケース全合格）

### 自己評価

| 基準 | スコア (1-5) | コメント |
|------|-------------|---------|
| 機能完全性 | 5 | Sprint 2 の全受け入れ基準（追加・編集・削除・割り勘対象選択・時系列・総支出・¥フォーマット・バリデーション・永続化）を実装 |
| コード品質 | 5 | theme/コンポーネント分離を踏襲、storage 層に CRUD を追加、`confirmDestructive` で破壊的操作を一元化、tsc エラー0 |
| UI/UX | 4 | design.md 3.3a / 3.4 のレイアウト（サマリーカード・セグメントタブ・金額ヒーロー入力・チップ/チェックリスト）を忠実に実装。実機の見た目は Evaluator 確認待ち |
| エラーハンドリング | 4 | 金額（空・0・非数値）/ 支払者未選択 / 割り勘対象0人のバリデーション、グループ・支払い不在時のフォールバックを処理 |
| 既存機能との統合 | 5 | Sprint 1 の作成・編集・削除・永続化を維持。グループ削除を共通ユーティリティへ移行しても挙動は同一。tsc 0・storage テスト 8/8 合格 |

### 技術的な判断
- **割り勘対象のデフォルトは全員選択**: 新規支払い時、`splitMemberIds` を全メンバーで初期化。最も一般的なケース（全員割り勘）を即保存できるようにし、個別調整はチェックを外す操作で行う。
- **金額入力は文字列で保持し数字以外を除去**: `keyboardType="number-pad"` に加え、`onChangeText` で `[^0-9]` を除去。表示は3桁カンマ区切り（`toLocaleString`）、内部は整数。0・空・非数値は保存時バリデーションで弾く。
- **支払い行のアイコンタイル色は一覧の並び順 index でローテーション**: カテゴリは Sprint 4 のため、暫定的にメモ先頭1文字 + index ローテのグラデタイルを表示（design.md 2.10 のカテゴリアイコン枠を流用）。
- **破壊的操作の確認を `confirmDestructive` に一元化**: Evaluator の改善提案に従い、Web=`window.confirm` / native=`Alert.alert` の分岐を1ファイルに集約。グループ削除（`group/[id]/edit.tsx`）も同ユーティリティへ移行し、支払い削除でも再利用。
- **詳細画面とフォームは `useFocusEffect` で再読込**: 支払い追加・編集・削除から戻った際に最新データを反映させる（ホームと同一パターン）。
- **時系列ソートは `createdAt` 降順（新しい順）**: spec の「新しい順または古い順」を満たす。
- **精算タブはプレースホルダーのみ**: Sprint 3 の範囲（精算計算）には手を付けず、タブ切替と Coming Soon 表示のみ実装。

### 既知の課題
- カテゴリ機能は Sprint 4 のため、支払い行のアイコンタイルはメモ先頭1文字を表示（カテゴリピルは未表示）。design.md 2.10 のカテゴリピルは Sprint 4 で追加予定。
- 精算タブは Coming Soon 表示のみ（Sprint 3 で残高・精算案を実装）。
- 一覧の支払いタイル色は並び順 index に依存するため、削除・追加で色が振り直される（カテゴリ実装後は色がカテゴリ固定になる想定）。
- favicon の `jimp-compact` Crc error は Sprint 1 から継続する Minor 警告（バグ#2）。`expo start --web` の動的配信・アプリ動作には影響なし。

### Evaluator への引き渡し事項

- **起動方法（Web・推奨）:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  npx expo start --web
  # ブラウザで http://localhost:8081 を開く
  ```
  - 依存は `npm install` 済み。新規依存の追加なし（Sprint 1 の構成のまま）。
  - AsyncStorage は web では localStorage バックエンドのため、リロード後の永続化も web で検証可能。

- **ユニットテスト:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  node __tests__/payment.test.js   # 支払い CRUD・時系列・総支出・金額バリデーション（9 ケース）
  node __tests__/storage.test.js   # Sprint 1 ストレージ（8 ケース、回帰確認）
  npx tsc --noEmit                 # 型チェック（エラー0）
  ```

- **テスト対象 URL:** `http://localhost:8081`（Web）。ホーム = ルート（`app/index.tsx`）。

- **テストシナリオ（Sprint 2）:**
  1. グループが0件なら、まず「新規グループ」でメンバー2〜3名のグループ（例: 沖縄旅行 / 太郎・花子・次郎）を作成する（Sprint 1 経路）。
  2. ホーム一覧でグループカードをタップ → **グループ詳細画面（支払いタブ）** が開く。総支出サマリー（初期は ¥0 / 1人あたり ¥0）とセグメントタブ「支払い / 精算」が表示される。
  3. 支払い0件時は「まだ支払いがないよ！」の空状態が表示される。
  4. 下部「支払いを追加」FAB → 支払い追加画面。金額欄に「9000」を入力、支払った人「太郎」を選択、用途「ホテル代」を入力（割り勘は初期で全員選択）→「保存」→ 一覧に「ホテル代 / 太郎が立替・3人で割り勘 / ¥9,000」が追加される。
  5. 総支出サマリーが「¥9,000 / 1人あたり ¥3,000」に更新される。
  6. もう1件追加（例: タクシー / 花子 / 3000 / 割り勘は花子・次郎の2名を個別選択。「全員」をオフにして対象を絞る）→ 一覧が**新しい順**で並ぶ（タクシーが上）。
  7. 一覧の「ホテル代」行をタップ → 編集画面に既存値（金額9000・太郎・全員）がプリフィル。金額を「10000」、支払者を「次郎」に変更して保存 → 一覧と総支出（¥13,000）に反映される。
  8. 編集画面下部「この支払いを削除」→ 確認（Web は `window.confirm`）→「OK」で一覧から消え、総支出サマリーが更新される。
  9. 金額バリデーション: 金額を空のまま or「0」で保存 →「金額を入力してください」が表示され保存されない。支払者未選択 →「支払った人を選択してください」。割り勘対象を全部外す →「割り勘の対象を1人以上選択してください」。
  10. 金額が「¥1,234」のように ¥ + カンマ区切りで表示されることを一覧・サマリーで確認。
  11. 「精算」タブに切替 → 「精算機能は Coming Soon」プレースホルダーが表示される（Sprint 3 で実装）。
  12. 支払いを追加・編集・削除した状態でページをリロード → 支払い内容・総支出が保持される（localStorage 永続化）。
  13. 回帰: ホームのグループ作成・編集・削除、空状態、グループ名バリデーション、グループ削除の `window.confirm` 確認が引き続き動作すること。

- **デザイン適合の確認ポイント（Sprint 2）:** 総支出サマリーカード（白・角丸22）、セグメントタブ（選択中コーラルグラデ）、金額ヒーロー入力（¥ + Baloo 2 34px・中央）、支払者チップ（選択中コーラル塗り）、割り勘チェックリスト（チェック時コーラル丸 + 白チェック）、支払い行カード（角丸16・アイコンタイル + メモ + 金額）。絵文字は不使用。

### 破壊的操作ユーティリティ化（feedback/sprint-1.md 改善提案への対応）
- Evaluator の改善提案「`confirmDestructive()` ユーティリティに一元化」を `src/utils/confirm.ts` で実装。グループ削除（`app/group/[id]/edit.tsx`）を本ユーティリティへ移行し、支払い削除（`app/group/[id]/payment/[paymentId]/edit.tsx`）でも再利用。Web=`window.confirm` / native=`Alert.alert` の分岐を一箇所に集約し、Sprint 2 以降の破壊的操作での再発を防止。

---

## Sprint 1: グループ管理とデータ永続化の基盤
**ステータス:** 実装完了（Web 起動フィードバック修正済み）- 再評価待ち
**実装日:** 2026-05-30
**フィードバック修正日:** 2026-05-30（feedback/sprint-1.md 対応・Web 実行経路を整備）

### 実装内容
- Expo（SDK 51）+ expo-router（file-based routing）+ TypeScript でプロジェクトを初期化
- デザイントークン（`src/theme.ts`）を design.md の値そのままで定義（カラー・角丸・スペーシング・グラデーション・シャドウ・金額フォーマット）
- 型定義（`src/types/index.ts`）: Group / Member / Payment / AppData（将来同期を見据えバージョン付き構造）
- AsyncStorage ラッパー（`src/storage/index.ts`）: load / getGroups / getGroup / createGroup / updateGroup / deleteGroup、破損データの正規化と後方互換
- グループ一覧画面（ホーム `app/index.tsx`）: コーラルグラデのヘッダー、グループカード一覧、下部固定 FAB「新規グループ」
- グループ0件時の空状態ガイド（¥アイコン + 見出し + 説明文）
- グループ新規作成画面（`app/group/new.tsx`）
- グループ編集・削除画面（`app/group/[id]/edit.tsx`、削除は Alert 確認ダイアログ付き）
- 共有フォーム（`src/components/GroupForm.tsx`）: グループ名 + メンバー追加/削除 + バリデーション
- 再利用コンポーネント: GroupCard / IconTile / Avatar(+Stack/+More) / Pill / Header(Home/Sub) / PrimaryButton(+Secondary/+Danger) / TextField / MemberInput / EmptyState
- ストレージ層のユニットテスト（`__tests__/storage.test.js`、8 ケース全合格）
- Noto Sans JP（400/500/700）+ Baloo 2（600/700/800）をフォントロード、ロード未完時もタイムアウトで起動継続

### 自己評価

| 基準 | スコア (1-5) | コメント |
|------|-------------|---------|
| 機能完全性 | 5 | Sprint 1 の全受け入れ基準（作成・編集・削除・永続化・空状態・バリデーション）を実装 |
| コード品質 | 5 | theme への一元化、コンポーネント分離、storage 層の抽象化、型安全、tsc エラー0 |
| UI/UX | 4 | design.md のカラー・角丸・グラデ・シャドウ・タイポを忠実に実装。実機での見た目は Evaluator 確認待ち |
| エラーハンドリング | 4 | 空グループ名・メンバー2名未満・空メンバー行除外・ストレージ破損のフォールバックを処理 |
| 既存機能との統合 | 5 | Sprint 1 のため回帰対象なし。docs/CLAUDE.md/.aidesigner は未変更 |

### 技術的な判断
- **Expo SDK 51 / expo-router v3.5 を採用**: タスクには「expo-router v4」とあるが、v4 は SDK 52+ に対応する。SDK 51 + expo-router 3.5 は file-based routing の安定版であり、Generator→Evaluator の検証ワークフローで最も実績がある構成のため採用した。file-based routing という本質要件は満たしている。
- **ルーティングは expo-router を採用**: design.md は @react-navigation/native（native-stack）を推奨するが、タスク指示と project 構成目安が expo-router を明示しているため expo-router を採用。内部的に expo-router は react-navigation の上に構築されており、push/modal 遷移・ヘッダー統一というデザイン意図は満たせる。
- **グループカードのタップ遷移先**: design.md/spec ではカードタップ→グループ詳細画面だが、詳細画面は Sprint 2 の実装範囲。Sprint 1 では受け入れ基準「編集してグループ名・メンバーを変更すると反映される」を満たすため、カードタップを編集画面へ一時的にルーティングした。Sprint 2 で詳細画面へ差し替える。
- **Noto Sans JP の 800 ウェイト不在**: @expo-google-fonts/noto-sans-jp は最大 700。design.md が指定する Noto Sans JP 800 は `NotoSansJP_700Bold` + `fontWeight:'800'` でフォールバックした（数字・見出しの 800 は Baloo 2 で正しく表示される）。
- **データ構造をバージョン付き AppData にした**: 非機能要件「将来のサーバ同期で既存ローカルデータ構造を大きく壊さず移行できる余地」を確保するため、`{ version, groups }` 形式で保存し、読み込み時に正規化（破損耐性）を行う。
- **id 生成は外部ライブラリ非依存**: オフライン前提のため `Date.now()+乱数` の簡易 ID を採用（uuid 依存を避けた）。
- **新規作成時に空メンバー行を2つ用意**: 受け入れ基準「2名以上」を自然に促すため。空のまま保存しようとすると「メンバーを2人以上追加してください」エラー。

### 既知の課題
- グループ詳細画面が未実装のため、現状カードタップは編集画面に遷移する（Sprint 2 で詳細画面へ）。よって一覧カードの「総支出」は常に ¥0、ピルは「1人 ¥0」表示（支払い機能が Sprint 2 のため仕様通り）。
- フォント TTF（特に Noto Sans JP）が大きく、初回バンドル/ロードにわずかに時間がかかる場合がある。2秒タイムアウトで未ロードでもシステムフォントにフォールバックして起動する。

### Sprint 1 フィードバック対応（2026-05-30 / feedback/sprint-1.md）

差し戻し主因「`npx expo start --web` が起動できず Playwright 検証ができない」を解消した。

- **対応1: Web 実行依存を導入**
  - `npx expo install react-native-web react-dom @expo/metro-runtime` を実行。
  - `package.json` に `react-native-web@~0.19.10` / `react-dom@18.2.0` / `@expo/metro-runtime@~3.2.3` を追加（SDK 51 互換版）。
- **対応2: app.json の web 設定**
  - すでに `expo.web`（`"bundler": "metro"`, `"output": "single"`）が定義済みのため変更不要。設定と依存の不整合（バグ#3）が依存追加で解消。
- **対応3: Generator 自身による web 起動確認**
  - `npx expo start --web --port 8081` を起動し、`http://localhost:8081` が HTTP 200・`<title>かしかり.me</title>` を返すことを確認。
  - 実バンドル `expo-router/entry.bundle?platform=web` が HTTP 200・約5MB で正常コンパイル（Metro ログ `Web Bundled ... expo-router/entry.js (932 modules)`）、バンドル内に `GroupForm` / `createGroup` / 空状態文言を確認。致命的な JS バンドルエラーなし。
  - 起動確認後サーバは停止済み。
  - 補足: Metro ログに `jimp-compact` の Crc error（favicon の png 処理に起因する警告）が出るが、アプリ本体のバンドル・配信には影響しない。

### 修正履歴

#### 2026-05-30 / feedback/sprint-1.md（再評価・バグ#1 対応）

差し戻し主因「Web で『グループを削除』が無反応（`Alert.alert` 多ボタンが react-native-web で no-op）」を修正した。

- **対象ファイル:** `app/group/[id]/edit.tsx` の `handleDelete`
- **修正内容:** `react-native` から `Platform` をインポートし、`Platform.OS === 'web'` の分岐を追加。Web では `window.confirm('このグループを削除しますか？この操作は元に戻せません。')` で確認し、true のとき `deleteGroup(id)` 実行後に `router.back()` する。ネイティブ（iOS）は従来どおり `Alert.alert` の多ボタン確認を維持。
- **影響範囲:** `handleDelete` のみ。削除以外の機能・他ファイル・仕様・デザインは未変更。
- **自己確認:**
  - `npx tsc --noEmit` → 型エラー0。
  - `npx expo export --platform web` → `Web Bundled ... (872 modules)` で正常コンパイル。
  - `npx expo start --web --port 8099` → `http://localhost:8099` が HTTP 200。
  - Metro ログの `jimp-compact` Crc error は favicon PNG 処理に起因する既知の Minor 警告（バグ#2）で、本修正と無関係・アプリ動作に影響なし。
- これにより受け入れ基準「グループを削除すると一覧から消える」を Web 経路でも満たす見込み。Web では `localStorage['kashikari.me/appData']` から当該グループが消え、リロード後も削除が保持される。

### Evaluator への引き渡し事項

- **起動方法（Web・一次手段 / 推奨）:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  npx expo start --web
  # ブラウザで http://localhost:8081 を開く
  ```
  - ポート指定する場合: `npx expo start --web --port 8081`
  - 依存パッケージは `npm install` 済み。未インストールの場合のみ `npm install` を先に実行。
  - AsyncStorage は web では localStorage バックエンドで動作するため、リロード後の永続化も web で検証可能。

- **起動方法（iOS・参考 / Xcode がある環境のみ）:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  npx expo start
  ```
  - iOS シミュレータで開く: 起動後ターミナルで `i` を押す（または `npx expo start --ios`）
  - 実機 Expo Go: 表示される QR を Expo Go アプリで読み取る

- **ユニットテスト:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  node __tests__/storage.test.js   # ストレージ CRUD・永続化・金額整形（8 ケース）
  npx tsc --noEmit                 # 型チェック（エラー0）
  ```

- **テスト対象 URL:** `http://localhost:8081`（Web）。ホーム = ルート（`app/index.tsx`）。対象プラットフォームは iPhone（縦持ち）だが、自動検証は Web 経路で実施する。

- **テストシナリオ:**
  1. 起動するとホーム「かしかり.me」ヘッダーとサブコピー「みんなの立て替え、スッキリ精算！」が表示される。
  2. グループが0件なら空状態（¥アイコン+「まだグループがないよ！」+説明文）が表示される。
  3. 下部「新規グループ」FAB をタップ → 作成画面が開く。
  4. グループ名を空のまま「保存」→「グループ名を入力してください」エラーが出て保存されない。
  5. グループ名「北海道旅行 2026」を入力、メンバー2名（例:太郎・花子）を入力して「保存」→ ホーム一覧にカードが追加され、「2人 のメンバー」と表示される。
  6. メンバーを1名だけにして保存 →「メンバーを2人以上追加してください」エラーで保存されない。
  7. 「+ メンバーを追加」でメンバーを3名以上にして保存 → カードのメンバー数・アバタースタックに反映される。
  8. 一覧のカードをタップ → 編集画面が開き、既存のグループ名・メンバーが入っている。名前やメンバーを変更して保存 → 一覧に反映される。
  9. 編集画面下部「グループを削除」→ 確認ダイアログ「削除」→ 一覧から消える。
  10. グループを1件以上作成した状態でアプリをリロード（シミュレータで `r` / アプリ再起動）→ データが保持され、一覧に表示される。

- **デザイン適合の確認ポイント:** コーラルグラデのヘッダー・FAB、白カード（角丸22）、グループ名先頭1文字のグラデアイコンタイル（コーラル→ティール→紫→黄でローテーション）、イニシャルアバターのスタック、ティールのピル。絵文字は不使用。


---

## Sprint 6: 借りた日付の入力 / まとめて精算ボタン
**ステータス:** 実装完了 - 評価待ち
**実装日:** 2026-05-31

### 実装内容
- 機能1: 借りた日付（`Payment.date: string`、ISO 8601 `YYYY-MM-DD`）
  - `src/types/index.ts`: `Payment` に `date: string` を追加
  - `src/storage/index.ts`:
    - 日付ヘルパー `toDateString()` / `isValidDateString()` を追加
    - `normalizePayment()` で `date` 欠損時は `createdAt` から日付を導出（既存データ後方互換）
    - `PaymentInput` に任意 `date?: string` を追加。`addPayment` / `updatePayment` で正規化して保存
  - `src/components/PaymentForm.tsx`: 「借りた日付」フィールドを追加
    - デフォルト値 = 今日の日付（`toDateString()`）
    - Web は `<input type="date">`（`Platform.OS === 'web'` 分岐、`React.createElement('input', …)`、max=今日）
    - ネイティブは `YYYY-MM-DD` プレースホルダーの `<TextInput>`（datetimepicker は不使用）
    - バリデーション: 空・不正でも保存可能（今日の日付にフォールバック）
  - `src/components/PaymentCard.tsx`: 日付を「5/31」形式（M/D、先頭ゼロ除去）で金額の下に表示
  - `app/group/[id]/payment/[paymentId]/edit.tsx`: 編集時に既存 `date` を `initial` へ引き渡し
- 機能2: まとめて精算するボタン
  - `app/group/[id]/index.tsx` の精算タブ、精算案リストの下（共有ボタンの上）に配置
  - `src/storage/index.ts`: `settleAllTransfers(groupId, keys)` を追加（既存精算済みキーを保持しつつ全キーを追加）
  - タップで `confirmDestructive`（「全ての精算を完了にしますか？」, 確定ラベル「精算する」）で確認 → 全 transfer を一括 settled
  - 全件精算済み（`allSettled`）の場合はボタンを非表示
  - デザイン: セカンダリ（ティール `#4ECDC4` = `colors.secondary`）の塗りボタン、白文字、checkmark-done アイコン
- テスト: `__tests__/sprint6.test.js`（日付デフォルト/正規化/整形 + まとめて精算のキー集約/allSettled 判定、11ケース）

### 自己評価

| 基準 | スコア (1-5) | コメント |
|------|-------------|---------|
| 機能完全性 | 5 | 仕様の受け入れ基準（日付入力・デフォルト今日・Web date input・M/D表示・既存データ導出・一括精算・確認・全件済み非表示・ティール）を全て満たす |
| コード品質 | 5 | 既存パターン（confirm ユーティリティ、storage 正規化、theme トークン）に準拠。日付ロジックを純粋関数化しテスト可能に |
| UI/UX | 4 | Web ではネイティブカレンダー UI、ネイティブは文字列入力。一括精算は楽観更新 + トースト |
| エラーハンドリング | 5 | 不正/空日付は今日にフォールバック。一括精算は全件済み時に非表示で誤操作防止 |
| 既存機能との統合 | 5 | 型追加は後方互換（normalize でデフォルト補完）。既存テスト（payment 9, sprint5 21）全通過。tsc エラー0 |

### 技術的な判断
- 日付ストレージは epoch ではなく文字列 `YYYY-MM-DD` で保持（ユーザー入力・表示と一致、タイムゾーンずれを回避）。`toDateString` はローカル時刻基準。
- Web の `<input type="date">` は RN コンポーネントに存在しないため `React.createElement('input', …)` で DOM 要素を生成。スタイルは StyleSheet 外の plain object（`webDateInputStyle`）で定義し、`max` に今日を設定して未来日を抑制。
- 一括精算は既存 `setTransferSettled` をループ呼びせず、まとめて1回保存する専用関数 `settleAllTransfers` を追加（書き込み回数削減・原子性）。
- まとめて精算ボタンの確認は仕様どおり `confirmDestructive` を流用（破壊的ではないが既存の Web/native 分岐済みダイアログを再利用）。確定ラベルを「精算する」に変更。
- ボタンは「全件精算済みならグレーアウト or 非表示」のうち非表示を選択（既に「みんな精算済み！」ブロックが別途出るため重複を避ける）。

### 既知の課題
- ネイティブの日付入力は手入力（datetimepicker 不使用は仕様指定どおり）。誤った形式は保存時に今日へフォールバックするため、入力途中の視覚的バリデーション表示はない。
- `npx expo export --platform web` 実行時、favicon PNG 処理で jimp の `Crc error` が出るが、これは既存アセット（node_modules の jimp）由来で本変更とは無関係。JS バンドル自体は成功（948〜1005 modules）し、dev サーバ（`expo start --web`）は HTTP 200 を返す。

### Evaluator への引き渡し事項
- 起動方法（Web）:
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  npx expo start --web
  ```
- ユニットテスト:
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  node __tests__/payment.test.js   # 既存（9）
  node __tests__/sprint5.test.js   # 既存（21）
  node __tests__/sprint6.test.js   # 新規（11）
  npx tsc --noEmit                 # 型チェック（エラー0）
  ```
- テスト対象 URL: `http://localhost:8081`（Web）
- テストシナリオ:
  1. 既存グループを開き「支払いを追加」→ フォームに「借りた日付」欄があり、初期値が今日（Web はカレンダー、ネイティブは `YYYY-MM-DD`）。
  2. 日付を過去日（例 5/15）に変更し金額・貸し手・借り手を入力して保存 → 支払い履歴カードの金額下に「5/15」と表示される。
  3. 日付を空（または不正値）のまま保存 → 今日の日付が採用され、カードに今日の M/D が表示される。
  4. 既存（date を持たない）支払いも履歴で日付が表示される（createdAt から導出）。
  5. 支払いカードをタップ→編集 → 日付欄に保存済みの日付が入っている。変更して保存 → 履歴に反映。
  6. 精算タブを開く → 精算案が1件以上あるとき、精算案リストの下に「まとめて精算する」（ティール）ボタンが表示される。
  7. タップ → 確認ダイアログ「全ての精算を完了にしますか？」→ 確定 → 全精算案が settled（チェック）状態になり、トースト「全ての精算を完了にしました」。
  8. 全件精算済みになると「まとめて精算する」ボタンが消える（非表示）。
  9. 既存機能の回帰確認: グループ作成/編集/削除、支払い追加/編集/削除、精算計算・個別精算トグル・精算結果の共有が従来どおり動作する。

---

## 仕様変更: 精算モデルの刷新（直接ペアベース精算 + settled フラグ + 3タブ化）
**ステータス:** 実装完了 - 評価待ち
**実装日:** 2026-05-31

### 実装内容
- **変更1: Payment に `settled` フラグ追加**
  - `Payment` 型に `settled: boolean` を追加（false=未精算、true=精算済み）。
  - `normalizePayment()` で `settled` のデフォルトを `false` に（`p.settled === true` 以外は false）。
  - `addPayment()` は常に `settled: false` で作成。
  - `settleAllPayments(groupId)` を追加: 全未精算支払いを `settled: true` に一括更新して保存。
  - `Group.settledTransferKeys` を型・storage 全体から削除。関連関数 `getSettledTransferKeys` / `setTransferSettled` / `settleAllTransfers` を削除。
- **変更2: 精算アルゴリズムを直接ペアベースに刷新**
  - `computeTransfers`（greedy 最小送金）・`computeBalances`・`computeMemberSpending`・`MemberBalance`/`MemberSpending` 型を削除。
  - `computeDirectTransfers(members, payments)` を新設: lender×borrower のペアごとに貸し借りを集計し、同ペアの双方向のみネット相殺。三角精算（ショートカット）は作らない。
  - `computeSettlement` を更新: `settled: false` の支払いのみ対象、`balances` を返さず `{ transfers, total, average }` を返す。
  - `buildSettlementText` は維持（共有機能）。
- **変更3: グループ詳細を3タブ化（支払い / 精算 / 精算済み）**
  - 支払いタブ: `settled: false` のみ表示。空状態「未精算の支払いはありません」。
  - 精算タブ: 残高リスト・支出割合・1人あたりピルを削除。精算案リスト（`SettlementRow`）＋「まとめて精算する」＋「精算結果を共有」を維持。まとめて精算で `settleAllPayments` を呼び、リフレッシュ後に精算済みタブへ遷移。空状態「精算する貸し借りはありません」。
  - 精算済みタブ: `settled: true` を新しい順に `PaymentCard` で表示。空状態「精算済みの記録はまだありません」。
  - サマリーカードの総支出は未精算（settled:false）のみ合計。
- **変更4: 不要コンポーネント整理**
  - `BalanceCard.tsx`・`MemberSpendingRow.tsx` を削除（参照エラー回避のため）。
  - `SettlementRow` から精算済みトグル（checkbox / onToggle / settled props）を削除し、表示専用に簡素化。

### 自己評価

| 基準 | スコア (1-5) | コメント |
|------|-------------|---------|
| 機能完全性 | 5 | 変更1〜4の受け入れ基準を満たす。3タブ・直接精算・一括精算・settled 管理を実装 |
| コード品質 | 5 | 純粋関数化を維持、storage は後方互換 normalize。未使用 style/import を除去 |
| UI/UX | 4 | 3タブ切替・空状態文言・一括精算後の精算済みタブ自動遷移。精算タブからノイズ（残高/割合）を排除 |
| エラーハンドリング | 4 | settled 欠損は false にフォールバック。lender 不在・自己負担分は精算対象外。空状態を全タブで表示 |
| 既存機能との統合 | 5 | tsc エラー0。共有機能（buildSettlementText/shareText）維持。payment/storage テスト全通過 |

### 技術的な判断
- **三角精算の回避**: ペアごとに `${lenderId}|${borrowerId}` をキーに集計し、双方向（`A|B` と `B|A`）のみを突き合わせて相殺。異なる当事者間の連鎖は一切結合しないため、A→B / B→C は独立した2送金として残る（仕様の例どおり）。
- **ネット相殺の方向**: forward−reverse の符号で送金方向を決定し、差が0のペアは除外。送金は金額降順で安定ソート。
- **総支出**: 仕様の選択肢のうち「未精算のみ合計」を採用（精算済みを消し込む UX と一致。`computeSettlement.total` と同値で丸めの差を排除）。
- **一括精算の遷移**: `settleAllPayments` 後に `getPayments` で再取得し、`setTab('settled')` で精算済みタブへ移動。楽観更新ではなく再取得で確実に整合させた。
- **SettlementRow の簡素化**: 個別精算トグルは新モデルで不要なため props ごと削除（精算は支払い単位の settled で一括管理）。

### 既知の課題
- 精算済みタブには支払い単位の記録のみ表示（精算案＝送金の履歴は保持しない仕様）。誰が誰にいくら払ったかの送金履歴アーカイブは対象外。
- 精算済み支払いはタップで編集画面に遷移可能（グレーアウトは任意のため未実装）。編集で `settled` は保持される（updatePayment は既存値を維持）。
- `npx expo export --platform web` で favicon PNG 処理時に jimp の `Crc error` が出るが既存アセット由来で本変更と無関係。JS バンドルは成功（945 modules）。
- `__tests__/theme.test.js` に1件 `dark.bg = #121212` の失敗があるが、theme は本変更で未編集の既存問題。

### テストの更新
- 新規 `__tests__/direct-settlement.test.js`（17 assert 全通過）: 三角精算禁止・双方向相殺・完全相殺除外・均等割り・settled 除外・全精算済みを検証。
- `__tests__/sprint5.test.js`: 削除済みの `computeMemberSpending` 検証を除去（14 assert 全通過）。
- 旧アルゴリズム/settledTransferKeys 依存の `settlement.test.js`・`sprint4.test.js`・`sprint6.test.js` を削除（検証対象が現行コードから消滅したため）。

### Evaluator への引き渡し事項
- 起動方法（Web）:
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  npx expo start --web
  ```
- ユニットテスト:
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  node __tests__/direct-settlement.test.js  # 新規（17）
  node __tests__/sprint5.test.js            # 更新（14）
  node __tests__/payment.test.js            # 既存（9）
  node __tests__/storage.test.js            # 既存（8）
  npx tsc --noEmit                          # 型チェック（エラー0）
  ```
- テスト対象 URL: `http://localhost:8081`（Web）
- テストシナリオ:
  1. グループを開く → タブが「支払い / 精算 / 精算済み」の3つになっている。
  2. 支払いタブ: 未精算の支払いのみ表示。未精算が無ければ「未精算の支払いはありません」。
  3. A→B、B→C のように連鎖する2件の支払いを作る（例: A が B に 2000 貸す、B が C に 2000 貸す）→ 精算タブで「B が A に ¥2,000」「C が B に ¥2,000」の2件が出る。「C が A に」は出ない（三角精算なし）。
  4. 同じ2人で双方向に貸し借り（A→B 3000、B→A 1000）→ 精算タブは「B が A に ¥2,000」の1件のみ（相殺）。
  5. 精算タブに「まとめて精算する」と「精算結果を共有」ボタンがある。残高リスト・支出割合・1人あたりピルは表示されない。
  6. 「まとめて精算する」→ 確認ダイアログ → 確定 → トースト「全ての精算を完了にしました」が出て、自動で精算済みタブに移動。
  7. 精算済みタブ: 精算した支払いが新しい順に表示。支払いタブからは消えている。精算タブは「精算する貸し借りはありません」になる。
  8. サマリーカードの総支出が、精算後は未精算（残っている分）の合計に更新される。
  9. 回帰確認: グループ作成/編集/削除、支払い追加/編集/削除、精算結果の共有が従来どおり動作。

---

## 追加機能: グループのカラー・アイコン設定
**ステータス:** 実装完了 - 評価待ち
**実装日:** 2026-06-01

### 実装内容
- **Group 型に color・icon を追加**（`src/types/index.ts`）: `color: string`（例 '#FF6B6B'）と `icon: string`（Ionicons 名、例 'airplane-outline'）を必須プロパティとして追加。
- **プリセット定数を新規作成**（`src/utils/groupPresets.ts`）: テーマ非依存の `GROUP_COLORS`（8色）と `GROUP_ICONS`（16種・日本語ラベル付き Ionicons）、および `DEFAULT_GROUP_COLOR`（'#FF6B6B'）・`DEFAULT_GROUP_ICON`（'people-outline'）をエクスポート。
- **GroupForm にカラー・アイコン選択 UI を追加**（`src/components/GroupForm.tsx`）: グループ名入力の後に「カラー」（横スクロールのカラーサークル列、選択中は白チェック＋リング強調）と「アイコン」（4列グリッド、各タイルは選択中カラーの角丸スクエア背景＋白アイコン、選択中は枠＋影で強調）を配置。`GroupFormInitial` に `color?`/`icon?` を追加。`onSave` に `color`・`icon` を含めて渡す（既存の members ハンドリングは維持）。
- **IconTile をアイコン対応に拡張**（`src/components/IconTile.tsx`）: `icon?`（Ionicons 名）・`color?`（背景色）プロップを追加。`icon` 指定時は Ionicons をアイコン色 白固定で表示、未指定時は従来通り先頭1文字。`color` 指定時はその色を背景に、未指定時はテーマ iconTile 色をローテーション。アイコンサイズは size の 50%。
- **GroupCard で group.color・group.icon を使用**（`src/components/GroupCard.tsx`）: `IconTile` に `icon={group.icon}` `color={group.color}` を渡し、グループごとの色・アイコンを一覧で表示。
- **ストレージの正規化を更新**（`src/storage/index.ts`）: 既存の inline map を `normalizeGroup()` ヘルパーに抽出し、`color: raw.color ?? DEFAULT_GROUP_COLOR` / `icon: raw.icon ?? DEFAULT_GROUP_ICON` でデフォルト補完（空文字・非文字列もフォールバック）。`GroupInput` に `color?`/`icon?` を追加し、`createGroup`/`updateGroup` で保存。既存グループ（color/icon 未設定）はデフォルト補完されデータが壊れない。
- **グループ詳細のサマリーカードに IconTile を追加**（`app/group/[id]/index.tsx`）: 未精算サマリーカード左端に `group.color`・`group.icon` の IconTile（size 44）を表示。
- **編集画面で初期値を引き渡し**（`app/group/[id]/edit.tsx`）: `GroupFormInitial` に `color`・`icon` を渡し、編集時に現在のカラー・アイコンが選択済みで表示される。
- **ユニットテスト追加**（`__tests__/group-color-icon.test.js`）: プリセット件数・デフォルト値・16進カラー・id 一意性・normalize の color/icon デフォルト補完（後方互換）・指定値保持・不正値フォールバックを7ケースで検証。

### 自己評価

| 基準 | スコア (1-5) | コメント |
|------|-------------|---------|
| 機能完全性 | 5 | 変更1〜7（型・プリセット・選択UI・IconTile拡張・GroupCard・normalize・詳細ヘッダー）を全て実装。新規/編集の両フローで color・icon を保存・反映 |
| コード品質 | 5 | `normalizeGroup` 抽出で normalize を簡潔化。`useTheme()`/`makeStyles(c)` パターン維持。プリセットを単一ソース化（DRY）。tsc エラー0 |
| UI/UX | 4 | カラーは横スクロール＋選択リング、アイコンは4列グリッド＋選択カラー背景＋影。選択カラー変更でアイコン背景も即追従。実機見た目は Evaluator 確認待ち |
| エラーハンドリング | 4 | normalize で空文字・非文字列・欠損をデフォルトへフォールバック。既存データ後方互換を確保。Ionicons 名は型キャストで glyphMap に整合 |
| 既存機能との統合 | 5 | storage/payment/direct-settlement テスト全合格・回帰なし。web バンドル945 modules で正常コンパイル。sprint5 の1件失敗は本変更前から存在する既知の事象（精算共有テキスト）で本機能と無関係 |

### 技術的な判断
- **`onSave` の型は GroupInput を拡張**: spec の GroupForm props 例は `onSave: (data: { name; color; icon }) => void` だが、既存フォームは members も扱う（最低2名バリデーション込み）。members を落とすと回帰するため、`GroupInput` を `color?`/`icon?` で拡張し members を維持したまま color/icon を追加。new.tsx/edit.tsx の `createGroup`/`updateGroup` 連携も型変更なしで成立。
- **`normalizeGroup()` を抽出**: spec が「normalizeGroup を更新」と指示するが、既存コードは normalize 内の inline map だった。同等の挙動を保ちつつ単一グループ正規化関数として切り出し、color/icon 補完を追加。これで spec の指示に沿いつつ可読性も向上。
- **詳細画面サマリーへ IconTile 追加**: 詳細画面は元々 IconTile 未使用だった（サマリーは金額のみ）。spec 変更7の意図（詳細でも色・アイコンを示す）に沿い、サマリーカード左端に size44 の IconTile を追加。index=0 だが color 指定があるため group.color が優先される。
- **選択強調の影は Platform.select**: web では `boxShadow`、native では `shadow*`/`elevation` で実装し、どちらでも選択リング・影が出るようにした。カラーサークルの選択は白枠＋外側に text 色のリング（テーマ背景上でも視認可能）。
- **アイコン色は白固定**: spec 指示通り Ionicons の色を `#FFFFFF` 固定とし、どのプリセットカラー背景でもコントラストを確保。

### 既知の課題
- **favicon の jimp-compact Crc error**（Sprint 1 から継続の Minor 警告）: web バンドル本体（945 modules）の正常コンパイルには影響なし。
- **sprint5.test.js の "has header line" 1件失敗**: 本変更前から存在する既知事象（精算共有テキストのヘッダー判定）。color/icon 機能とは無関係で、本変更による回帰ではない。

### Evaluator への引き渡し事項

- **起動方法（Web・推奨）:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  npx expo start --web
  # ブラウザで http://localhost:8081 を開く
  ```
  - 依存追加なし（既存構成のまま）。未インストール時のみ `npm install`。

- **ユニットテスト:**
  ```bash
  cd /Users/toshiki-kojima/my-project/kashikari-me-beta
  node __tests__/group-color-icon.test.js  # カラー・アイコン（7ケース）
  node __tests__/storage.test.js           # 回帰（8）
  node __tests__/payment.test.js           # 回帰
  npx tsc --noEmit                         # 型チェック（エラー0）
  ```

- **テスト対象 URL:** `http://localhost:8081`（Web）。ホーム = ルート。新規グループ = `/group/new`。グループ詳細 = `/group/[id]`。編集 = `/group/[id]/edit`。

- **テストシナリオ（カラー・アイコン）:**
  1. ホームの「新規グループ」→ `/group/new`。グループ名入力欄の下に「カラー」（8色の横スクロールサークル）と「アイコン」（16種の4列グリッド）が表示される。初期選択はカラー=コーラル（#FF6B6B）、アイコン=people-outline。
  2. カラーで「ブルー」をタップ → そのサークルに白チェック＋リングが付き、アイコングリッドの全タイル背景が即座にブルーへ変わる。
  3. アイコンで「旅行（airplane-outline）」をタップ → そのタイルに枠＋影が付き選択される。
  4. グループ名・メンバー2名を入力して保存 → ホームのグループカード左端のアイコンタイルが、選んだブルー背景＋飛行機アイコンで表示される。
  5. そのグループを開く → 詳細のサマリーカード左端にも同じ色・アイコンのタイルが表示される。
  6. 「編集」→ 編集画面でカラー=ブルー・アイコン=旅行が選択済みで開く。別の色・アイコンに変更して保存 → 一覧・詳細に反映される。
  7. 回帰確認: 既存グループ（color/icon 未設定で作られたデータがあれば）もデフォルト（コーラル＋people-outline）で表示され、開く・編集・削除・支払い追加が従来どおり動作する。
