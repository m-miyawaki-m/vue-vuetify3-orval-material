# docs/ 再構成(目的別4分類) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** docs/ 直下の26ファイルを目的別4フォルダ(guides / design / reference / archive)へ `git mv` し、README を用途別導線に書き直し、archive 資料にバナー注記を付ける。

**Architecture:** ファイル移動(履歴保持)→ リンク修正 → コード側参照(eslint メッセージ)の同期 → バナー追加 → README 書き直し、の順で各段階を独立コミットにする。資料の内容は書き換えない(バナー追加と README 以外)。

**Tech Stack:** git mv / Markdown / bash(リンクチェック)

**Spec:** `docs/superpowers/specs/2026-07-07-docs-restructure-design.md`

## Global Constraints

- 移動は必ず `git mv`(履歴保持)。ファイル内容の書き換えは「リンク修正・archive バナー・README・team-guide §6 の引用同期」のみ
- `docs/superpowers/` は移動もリンク修正もしない(点時記録)
- `docs/component-sharing/` はディレクトリごと archive へ移動(内部リンクは自己完結なので修正不要、バナーも付けない)
- コミットメッセージは日本語、種別プレフィックス(docs: / chore:)は既存履歴に合わせる
- 各タスク末尾で下記「リンクチェック」を実行し BROKEN が 0 件であること

**リンクチェック(全タスク共通で使用):**

```bash
cd docs && find . -path ./superpowers -prune -o -name '*.md' -print | while read -r f; do
  dir=$(dirname "$f")
  grep -oE '\]\([^)]+\.md[^)]*\)' "$f" | sed -E 's/^\]\(//; s/\)$//; s/#.*$//' | while read -r link; do
    case "$link" in http*|/*) continue;; esac
    [ -f "$dir/$link" ] || echo "BROKEN: $f -> $link"
  done
done
```

Expected: 出力なし(BROKEN 0件)。

---

### Task 1: ファイル移動とクロスリンク修正

**Files:**
- Move: docs/ 直下の26ファイル + component-sharing/(下記の表のとおり)
- Modify: 移動に伴いリンクが壊れる5ファイル(下記)

**Interfaces:**
- Consumes: なし
- Produces: 新パス構成(以降のタスクはすべて新パスを前提とする)。特に `docs/guides/team-guide.md` は Task 2 が参照する

- [ ] **Step 1: フォルダを作成し git mv で移動**

```bash
cd docs
mkdir -p guides design reference archive

git mv team-guide.md common-layer-architecture.md orval-zod-data-fetching-flow.md new-page-flow.md development-guide.md theme-guide.md vuetify-android-guide.md guides/

git mv architecture.md component-tree.md sequence.md state-transition.md screen-definition.md store-definition.md design/

git mv vue-reference.md vue-sequence.md typescript-reference.md vitest-reference.md playwright-reference.md vue-query-architecture.md reference/

git mv testing-guide.md vitest-guide.md test-flow.md why-orval-vue-query.md http-client-comparison.md openapi-orval-vue-query.md orval-without-vue-query.md component-sharing archive/
```

- [ ] **Step 2: リンクチェックを実行して壊れたリンクを列挙**

Global Constraints のリンクチェックを実行。
Expected: 以下の BROKEN が出る(README のリンクは Task 4 で全面書き直すため、この時点では README 分も含まれてよいが、README 以外は本タスクで直す)。

- [ ] **Step 3: フォルダをまたぐリンクを修正**

同一フォルダへ一緒に移動したリンク(guides/ 内の team-guide ↔ common-layer-architecture、common-layer-architecture → orval-zod-data-fetching-flow、archive/ 内の orval-without-vue-query → openapi-orval-vue-query)は**変更不要**。以下のみ修正する:

| ファイル(新パス) | 旧リンク | 新リンク |
|---|---|---|
| `guides/team-guide.md`(2箇所) | `./vue-query-architecture.md` | `../reference/vue-query-architecture.md` |
| `guides/team-guide.md`(1箇所) | `./playwright-reference.md` | `../reference/playwright-reference.md` |
| `guides/common-layer-architecture.md`(2箇所) | `./vue-query-architecture.md` | `../reference/vue-query-architecture.md` |
| `guides/common-layer-architecture.md`(1箇所) | `./openapi-orval-vue-query.md` | `../archive/openapi-orval-vue-query.md` |
| `guides/common-layer-architecture.md`(1箇所) | `./architecture.md` | `../design/architecture.md` |
| `design/store-definition.md`(1箇所) | `./team-guide.md` | `../guides/team-guide.md` |
| `archive/vitest-guide.md`(1箇所) | `./team-guide.md#...`(アンカー付き) | `../guides/team-guide.md#...`(アンカーは維持) |
| `archive/test-flow.md`(1箇所) | `./team-guide.md#...`(アンカー付き) | `../guides/team-guide.md#...`(アンカーは維持) |

アンカー(`#` 以降)は変更しない。表にないリンクがチェックで BROKEN と出たら、同じ要領で
「リンク元の新フォルダからの相対パス」に直す(ただし README.md の BROKEN は Task 4 で直すので放置)。

- [ ] **Step 4: リンクチェック再実行**

Expected: BROKEN は `./README.md` 起点のものだけ(Task 4 で解消)。それ以外は 0 件。

- [ ] **Step 5: コミット**

```bash
git add -A docs
git commit -m "docs: docs/ を目的別4フォルダ(guides/design/reference/archive)へ再構成"
```

---

### Task 2: eslint.config.js メッセージと team-guide §6 引用の同期

**Files:**
- Modify: `eslint.config.js:53,57,61`(no-restricted-imports の message 3箇所)
- Modify: `docs/guides/team-guide.md` の「6. ESLint に怒られたら」の表(メッセージ引用3箇所)

**Interfaces:**
- Consumes: Task 1 の新パス `docs/guides/team-guide.md`
- Produces: なし(整合性の維持のみ)

- [ ] **Step 1: eslint.config.js の3メッセージを更新**

`eslint.config.js` の `no-restricted-imports` 内、3つの `message` にある
`（docs/team-guide.md 参照）` を `（docs/guides/team-guide.md 参照）` に置換(3箇所とも)。

- [ ] **Step 2: team-guide §6 の引用を同期**

`docs/guides/team-guide.md` の「6. ESLint に怒られたら」の表の「出るメッセージ」列3行にある
`（docs/team-guide.md 参照）。` を `（docs/guides/team-guide.md 参照）。` に置換し、
eslint.config.js の実際のメッセージと一字一句一致させる。

- [ ] **Step 3: 検証**

Run: `npm run lint`
Expected: 0 errors
Run: `npm run type-check`
Expected: エラーなし
Run: `npm run test:run`
Expected: 全テスト PASS(150件)
Run: リンクチェック
Expected: README 起点以外 0 件

- [ ] **Step 4: コミット**

```bash
git add eslint.config.js docs/guides/team-guide.md
git commit -m "chore: ESLint メッセージの team-guide 参照パスを新構成に更新"
```

---

### Task 3: archive 資料へのバナー追加

**Files:**
- Modify: `docs/archive/` 直下の7ファイル(各ファイルのタイトル行(先頭の `# ...`)の直後に2行追加)

**Interfaces:**
- Consumes: Task 1 の新パス構成
- Produces: なし

- [ ] **Step 1: テスト系3ファイルにバナー追加**

`docs/archive/testing-guide.md` / `docs/archive/vitest-guide.md` / `docs/archive/test-flow.md` の
タイトル行の直後に空行を挟んで追加:

```markdown
> **📦 アーカイブ資料**: この資料は旧テスト方式のものです。現行は [guides/team-guide.md](../guides/team-guide.md) の「5. テストの書き方」を参照してください。
```

- [ ] **Step 2: orval 系4ファイルにバナー追加**

`docs/archive/why-orval-vue-query.md` / `docs/archive/http-client-comparison.md` /
`docs/archive/openapi-orval-vue-query.md` / `docs/archive/orval-without-vue-query.md` の
タイトル行の直後に空行を挟んで追加:

```markdown
> **📦 アーカイブ資料**: この資料は orval / vue-query 導入検討期の学習資料です。現行の構成は [guides/orval-zod-data-fetching-flow.md](../guides/orval-zod-data-fetching-flow.md) と [guides/common-layer-architecture.md](../guides/common-layer-architecture.md) を参照してください。
```

component-sharing/ にはバナーを付けない。

- [ ] **Step 3: リンクチェック**

Expected: README 起点以外 0 件(バナー内リンクも解決されること)。

- [ ] **Step 4: コミット**

```bash
git add docs/archive
git commit -m "docs: archive 資料の冒頭に現行資料への案内バナーを追加"
```

---

### Task 4: README.md 全面書き直し

**Files:**
- Modify: `docs/README.md`(全文置換)

**Interfaces:**
- Consumes: Task 1 の新パス構成
- Produces: なし(最終成果物)

- [ ] **Step 1: README.md を以下の内容に全文置換**

````markdown
# ドキュメント一覧

## まずここから(用途別の入口)

- **ページを作る・修正する** → [guides/team-guide.md](./guides/team-guide.md)
- **共通層(データ取得・エラー処理)の仕組みを知る** → [guides/common-layer-architecture.md](./guides/common-layer-architecture.md)
- **画面・store の仕様を調べる** → [design/](#design-このアプリの設計書)

## guides/ — 現行の実務ガイド

今の開発ルール・手順の「正」。迷ったらここを読む。

| ファイル | 内容 |
|---------|------|
| [team-guide.md](./guides/team-guide.md) | チーム製造ガイド(ページの作り方・テストの書き方・ESLint 対応・FAQ)— **製造する人はまずこれ** |
| [common-layer-architecture.md](./guides/common-layer-architecture.md) | 共通層の設計意図・データフロー・エラー処理3段構えの全体像 |
| [orval-zod-data-fetching-flow.md](./guides/orval-zod-data-fetching-flow.md) | openapi.yaml → orval 生成 → composable → ページのデータ取得フロー(現行構成の解説) |
| [new-page-flow.md](./guides/new-page-flow.md) | 新規ページ作成フローチャート(openapi.yaml 起点) |
| [development-guide.md](./guides/development-guide.md) | 部品の追加とカスタマイズ(ページ・タブ・ダイアログ・レイアウト) |
| [theme-guide.md](./guides/theme-guide.md) | テーマ・カラー制御(切り替え・追加・CSS 変数) |
| [vuetify-android-guide.md](./guides/vuetify-android-guide.md) | Android(Capacitor)での Vuetify コンポーネント可用性と注意点 |

## design/ — このアプリの設計書

画面・store・フローの仕様。実装と突き合わせて読む。

| ファイル | 内容 |
|---------|------|
| [architecture.md](./design/architecture.md) | アーキテクチャ概要・技術スタック・レイヤー構成図・ディレクトリ構成 |
| [component-tree.md](./design/component-tree.md) | コンポーネントツリー(検索フロー・メニューフロー・レイアウト構造) |
| [sequence.md](./design/sequence.md) | シーケンス図(検索・スキャン・メインメニュー・登録バリデーション) |
| [state-transition.md](./design/state-transition.md) | 状態遷移図(画面遷移・スキャナー・ワークセッション・バリデーション) |
| [screen-definition.md](./design/screen-definition.md) | 画面項目定義書(全ページの入力項目・表示項目・操作) |
| [store-definition.md](./design/store-definition.md) | Store 定義書(全 Pinia store の State / Getters / Actions) |

## reference/ — 汎用の文法・概念リファレンス

プロジェクトに依存しない文法・概念の解説。辞書的に使う。

| ファイル | 内容 |
|---------|------|
| [vue-reference.md](./reference/vue-reference.md) | Vue 3 文法・概念(Composition API / defineProps / スロット / Pinia / Router) |
| [vue-sequence.md](./reference/vue-sequence.md) | Vue 3 概念フロー シーケンス図(ライフサイクル / ref連鎖 / Props-Emits など10種) |
| [typescript-reference.md](./reference/typescript-reference.md) | TypeScript 文法・概念(型定義 / ジェネリクス / ユーティリティ型 / 型ガード) |
| [vitest-reference.md](./reference/vitest-reference.md) | Vitest 文法・パターン集(アサーション / モック / Vue Test Utils) |
| [playwright-reference.md](./reference/playwright-reference.md) | Playwright 文法・パターン集(操作 / アサーション / デバッグ) |
| [vue-query-architecture.md](./reference/vue-query-architecture.md) | vue-query(TanStack Query)の概念深掘り(キャッシュ / QueryKey / 状態機械) |

## archive/ — 旧方式・導入検討期の資料

**通常は読む必要なし。** 経緯や検討過程を知りたいときだけ。各ファイル冒頭に現行資料への案内あり。

| ファイル | 内容 |
|---------|------|
| [testing-guide.md](./archive/testing-guide.md) | 旧テスト方針(現行は team-guide の「5. テストの書き方」) |
| [vitest-guide.md](./archive/vitest-guide.md) | Vitest 詳細ガイド(旧方式の記述を含む) |
| [test-flow.md](./archive/test-flow.md) | 旧テスト作成フロー |
| [why-orval-vue-query.md](./archive/why-orval-vue-query.md) | orval + vue-query 採用理由の検討資料 |
| [http-client-comparison.md](./archive/http-client-comparison.md) | HTTP クライアント比較(axios / fetch / ky など) |
| [openapi-orval-vue-query.md](./archive/openapi-orval-vue-query.md) | OpenAPI → orval → vue-query の網羅的解説(導入検討期) |
| [orval-without-vue-query.md](./archive/orval-without-vue-query.md) | vue-query を使わない構成の検討 |
| [component-sharing/](./archive/component-sharing/vol1-components/README.md) | コンポーネント共有の教材シリーズ(vol1: 部品 / vol2: テーマ / vol3: データ) |

## superpowers/ — 開発プロセスの記録

機能ごとの設計書(specs/)と実装計画(plans/)。作成時点の記録なので、実装の現状とは差分がありうる。

## 図の描画

- **Mermaid**(新しめの資料): GitHub 上ではそのまま表示される。VS Code では
  [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid)
  拡張を入れると標準プレビュー(Ctrl+Shift+V)で表示できる
- **PlantUML**(design/ の図など): [PlantUML 拡張](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml)(Alt+D)、
  [オンライン](https://www.plantuml.com/plantuml/)、または
  [Markdown Preview Enhanced](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced)
  (これ1つで PlantUML / Mermaid 両対応)
````

- [ ] **Step 2: 最終検証**

Run: リンクチェック(Global Constraints のコマンド)
Expected: BROKEN 0 件(README 含む)
Run: `npm run lint` / `npm run type-check` / `npm run test:run`
Expected: すべてグリーン

- [ ] **Step 3: コミット**

```bash
git add docs/README.md
git commit -m "docs: README を用途別4分類の導線に全面書き直し"
```
