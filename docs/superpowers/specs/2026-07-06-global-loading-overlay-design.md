# グローバルローディングオーバーレイ 設計

作成日: 2026-07-06
ステータス: 承認済み(実装待ち)

## 目的

ページ遷移や検索・登録などの処理中に、画面全体にローディングインジケーター(グルグル)を表示する。
処理中であることをユーザーに明示し、あわせて操作をブロックして二度押しを防ぐ。

## 要件(ヒアリング結果)

| 論点 | 決定 |
|---|---|
| トリガー検知 | 自動検知。vue-query の fetch/mutation とルーター遷移を観測する。手動 show/hide は設けない |
| 既存のページ内ローディング表示 | 残す。StockSearchPage の v-progress-linear やボタンの :loading は無変更 |
| チラつき対策(遅延表示など) | 入れない。処理が始まったら即時表示するシンプルな実装 |

## アーキテクチャ

AppSnackbar / useSnackbar で確立済みの「モジュールスコープ state + composable + App.vue 常駐コンポーネント」パターンに従う。

```
App.vue
 ├─ <router-view/>
 ├─ <AppSnackbar/>
 └─ <AppLoadingOverlay/>          ← 新規
      ↑ useGlobalLoading()
         ├─ useIsFetching()       (vue-query: 取得系通信の実行中カウント)
         ├─ useIsMutating()       (vue-query: 更新系通信の実行中カウント)
         └─ isNavigating ref      (router ガードが更新)
```

### 変更ファイル

| ファイル | 種別 | 内容 |
|---|---|---|
| `src/composables/useGlobalLoading.ts` | 新規 | ローディング状態の合成ロジック |
| `src/components/ui/AppLoadingOverlay.vue` | 新規 | 全画面オーバーレイの表示 |
| `src/App.vue` | 修正 | `<AppLoadingOverlay />` を AppSnackbar の隣に追加 |
| `src/router/index.ts` | 修正 | beforeEach / afterEach / onError で遷移中フラグを更新 |

## useGlobalLoading の仕様

- モジュールスコープに `isNavigating = ref(false)` を持つ
- `startNavigation()` / `endNavigation()` をエクスポートし、router ガードから呼ぶ
  - `beforeEach` → `startNavigation()`
  - `afterEach` / `onError` → `endNavigation()`
- `useGlobalLoading()` は以下を合成した `isLoading: ComputedRef<boolean>` を返す
  - `useIsFetching({ predicate: (q) => q.meta?.globalLoading !== false }) > 0`
  - `useIsMutating() > 0`
  - `isNavigating.value`
- `useIsFetching` / `useIsMutating` は QueryClient の inject を使うため、`useGlobalLoading()` はコンポーネントの setup 内(= AppLoadingOverlay)から呼ぶ

### クエリ個別の除外規約

グルグルを出したくない通信(バックグラウンド更新など)が将来出てきたら、その useQuery に
`meta: { globalLoading: false }` を付けるだけで対象外にできる。今回は全クエリを対象とし、除外は使わない。

## AppLoadingOverlay の表示仕様

- `v-overlay` + 中央に `v-progress-circular indeterminate`(color: primary)
- `persistent`: クリック・Esc で閉じない(状態が消えるまで表示し続ける)
- scrim あり: 背後の UI への操作をブロックし、処理中の二度押しを防ぐ
- `contained`: `v-app`(スマホ枠 430px)の内側だけを覆う。PC プレビュー時に灰色の背景まで覆わないため
- z-index はダイアログより高く設定し、ダイアログ内の処理でも手前に出す
- `data-testid="global-loading"` を付与(テスト・E2E 用)

## 動作フロー

```
ページ遷移:  beforeEach → isNavigating=true → 表示 → afterEach/onError → false → 非表示
API 通信:   useQuery/useMutation 開始 → カウント > 0 → 表示 → 完了/エラー → カウント 0 → 非表示
```

## エラーハンドリング

手動 show/hide が存在せず、すべて「状態の観測」なので消し忘れが構造的に発生しない:

- 通信がエラーで終わっても isFetching/isMutating のカウントは 0 に戻る(エラー通知は既存の axios 層 → Snackbar の仕組みのまま)
- 遷移が失敗しても `router.onError` で `endNavigation()` が呼ばれる
- 即時 import のページへの遷移は beforeEach → afterEach が同期的に連続するため、Vue のリアクティビティのバッチ処理により実質描画されない

## テスト

- `useGlobalLoading` 単体テスト(`src/composables/__tests__/useGlobalLoading.test.ts`)
  - fetching 中に isLoading が true になる
  - mutation 中に isLoading が true になる
  - startNavigation/endNavigation で isLoading が切り替わる
  - `meta: { globalLoading: false }` のクエリは無視される
- `AppLoadingOverlay` コンポーネントテスト
  - isLoading に応じて表示/非表示が切り替わる(data-testid="global-loading" で検証)
- 既存のページ内ローディング表示・テストは無変更

## スコープ外

- 遅延表示・最低表示時間などのチラつき対策(要件で「即時表示」を選択)
- 既存ページ内ローディング表示の整理・削除
- 手動 show/hide API
