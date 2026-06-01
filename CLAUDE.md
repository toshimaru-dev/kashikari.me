# プロジェクトルール

このプロジェクトは5つのサブエージェント（Planner → UIDesigner → Generator → Evaluator → Releaser）による自動開発パイプラインで構築される。

## エージェント構成

```
Planner ──→ UIDesigner ──→ Generator ──→ Evaluator
 (企画)       (デザイン)      (実装)        (検証)
                               ↑               │
                               └── 不合格時 ──┘
                                               │ 全スプリント合格
                                               ▼
                                           Releaser
                                          (リリース準備)
```

## ファイル規約

| パス | 用途 | 書き込み権限 |
|------|------|-------------|
| `/docs/spec.md` | 製品仕様書 | Planner のみ |
| `/docs/design.md` | UIデザイン仕様書（確定済み） | UIDesigner のみ（確定モード） |
| `.aidesigner/proposals.json` | デザイン提案一覧 | UIDesigner のみ（提案モード） |
| `/docs/progress.md` | 実装進捗・自己評価 | Generator のみ |
| `/docs/feedback/sprint-N.md` | スプリント評価結果 | Evaluator のみ |
| `/docs/release/` | リリース準備成果物一式 | Releaser のみ |
| `docs/privacy-policy.html` | GitHub Pages 公開用プライバシーポリシー | Releaser のみ |

- **仕様書は Planner だけが書く。** UIDesigner・Generator・Evaluator・Releaser は読み取り専用。
- **デザイン仕様書は UIDesigner だけが書く。** Generator・Evaluator・Releaser は読み取り専用。
- **進捗は Generator だけが書く。** Evaluator・Releaser は読み取り専用。
- **フィードバックは Evaluator だけが書く。** Generator・Releaser は読み取り専用。
- **リリース成果物は Releaser だけが書く。** 他エージェントは読み取り専用。

## ワークフロー

### Step 0: 環境確認
- 動作に必要なコンポーネントが全て揃っているかを確認
- エージェント動作に必要なMCPサーバ全てConnectedしているかを確認
- 不足している場合は報告する

### Step 1: 企画（Planner）
- ユーザーの短いプロンプトを受け取り `/docs/spec.md` を生成
- 技術的な実装詳細（DB設計、API設計、技術スタック）には踏み込まない
- 各スプリントに Evaluator がテスト可能な受け入れ基準を必ず記述する

### Step 1.5a: デザイン提案（UIDesigner 提案モード）
- `/docs/spec.md` を読み、UI/UX 要件とユーザーフローを把握する
- AIDesigner MCP で **2〜3パターンのデザイン案** を生成し、`.aidesigner/` に保存する
- 各案をプレビュー表示し、`.aidesigner/proposals.json` に案の一覧を記録する
- **この時点では `/docs/design.md` は書かない**

### Step 1.5b: ユーザー承認（オーケストレーター）
- UIDesigner の提案サマリーをユーザーに提示する
- ユーザーに案の選択・修正フィードバックを求める
- 承認を得てから Step 1.5c に進む

### Step 1.5c: デザイン確定（UIDesigner 確定モード）
- ユーザーの選択・フィードバックを UIDesigner に渡す
- UIDesigner が必要に応じてデザインを修正し、`/docs/design.md` に最終仕様を書き込む
- Generator が迷わず実装できる粒度（色コード・数値込み）でデザイン仕様を記述する

### Step 2: 実装（Generator）
- `/docs/spec.md`・`/docs/design.md`・`/docs/progress.md` を読み、次のスプリントを特定
- **`/docs/design.md` が存在する場合は必ず参照し、デザイン仕様に従って実装する**
- **1回の呼び出しで1スプリントのみ実装する**
- 完了時に `/docs/progress.md` へ自己評価と引き渡し事項（起動方法、テストURL、テストシナリオ）を記録
- 前スプリントのフィードバック（`/docs/feedback/sprint-N.md`）があれば、修正を先に行う
- デザイン仕様と実装に乖離が生じた場合は `/docs/progress.md` にその理由を明記する

### Step 3: 検証（Evaluator）
- `/docs/spec.md` の受け入れ基準と `/docs/progress.md` の引き渡し事項を読む
- Playwright MCP でアプリを実際に操作してテスト
- 結果を `/docs/feedback/sprint-N.md` に出力
- 不合格の場合 → Generator に戻って修正（Step 2 へ）
- 合格の場合 → 次のスプリントへ（Step 2 へ）
- **全スプリント合格** → オーケストレーターに報告し Step 4 へ進む

### Step 4: リリース準備（Releaser）
- 全スプリントが合格してから呼び出す
- `/docs/spec.md` と `package.json` / `app.json` を読み、アプリ情報を把握する
- 以下の4タスクを順番に実行する：
  1. **EAS 証明書自動管理**: `eas.json` / `app.json` を設定し `/docs/release/certificates.md` に記録
  2. **プライバシーポリシー公開**: `docs/privacy-policy.html` を生成し GitHub Pages で公開、URL を `/docs/release/privacy-policy-url.md` に記録
  3. **ストアメタデータ作成**: iOS・Android 向けの説明文・キーワード等を `/docs/release/metadata/` に生成
  4. **スクリーンショット準備**: 必要サイズ一覧と撮影手順を `/docs/release/screenshots/` に作成
- 完了後、残りの手動作業（実際の撮影・申請）をユーザーに案内する

## 評価基準と閾値

| 基準 | 閾値 | 不合格時の扱い |
|------|------|---------------|
| 機能完全性 | 4/5 以上 | Generator に差し戻し |
| 動作安定性 | 4/5 以上 | Generator に差し戻し |
| UI/UX品質 | 3/5 以上 | Generator に差し戻し |
| エラーハンドリング | 3/5 以上 | Generator に差し戻し |
| 回帰なし | 5/5 必須 | Generator に差し戻し |
| デザイン仕様適合 | 3/5 以上 | Generator に差し戻し（`/docs/design.md` がない場合は評価対象外） |

**1つでも閾値を下回ればスプリント不合格。**

## 絶対ルール

1. **責務を越境しない** - Planner は実装しない。UIDesigner はコードを書かない。Generator は仕様・デザインを変更しない。Evaluator はコードを修正しない。Releaser はコード実装・仕様変更を行わない。
2. **スプリント順序を守る** - Sprint 1 → 2 → 3 と順番に実装する。スキップ禁止。
3. **動作する状態を維持する** - 各スプリント完了時にアプリが正常に起動・動作すること。
4. **フィードバックを最優先で処理する** - Generator は新スプリント着手前に、前スプリントの不合格フィードバックを修正すること。
5. **起動手順を必ず記載する** - Generator は `/docs/progress.md` にアプリの起動コマンドを毎回明記する。Evaluator はそれに従って起動する。
6. **デザイン承認なしで Generator を起動しない** - UIDesigner 確定モードが完了し `/docs/design.md` が存在するか、またはユーザーがデザインスキップを明示した場合にのみ Generator を呼び出す。
7. **全スプリント合格前に Releaser を起動しない** - Evaluator が全スプリントの合格を報告した後にのみ Releaser を呼び出す。