# ComponentSamplePage タブ化 設計書

**作成日**: 2026-06-18
**対象プロジェクト**: vue-vuetify3-orval-material (Vue 3 + Vuetify 4 + Capacitor 7)

---

## 概要

`ComponentSamplePage.vue` のUIコンポーネントサンプルをタブ分割で整理する。アコーディオンセクションを削除し、残りの9セクションを5つの `v-tabs` にグルーピングする。コンテンツ自体は変更しない。

---

## 要件

- アコーディオンセクション（`v-expansion-panels` を使った ① の部分）を削除する
- 残りのセクションを5タブに振り分ける
- タブはページ上部に sticky 表示してスクロール後も常に見える
- 変更対象ファイルは `src/pages/ComponentSamplePage.vue` 1ファイルのみ
- コンテンツ（各サンプルのUI・ロジック）は変更しない

---

## タブ構成

| タブ | 含むセクション |
|---|---|
| 入力・選択 | ラジオボタン / トグルボタン / プルダウンリスト / カレンダー / 時刻選択 |
| 表示制御 | v-if / v-show / v-menu |
| ダイアログ | 情報ダイアログ / 確認ダイアログ / フォームダイアログ / フルスクリーンダイアログ |
| 通知 | v-snackbar / v-bottom-sheet |
| スキャナー | BarcodeInputField / 連続スキャン→テーブル |

---

## 画面構造

```
SubLayout（タイトル: コンポーネントサンプル）
  └─ v-tabs (position: sticky, top: 0)
       ├─ v-tab: 入力・選択
       ├─ v-tab: 表示制御
       ├─ v-tab: ダイアログ
       ├─ v-tab: 通知
       └─ v-tab: スキャナー
  └─ v-window
       ├─ v-window-item: 入力・選択
       │    └─ v-container
       │         ├─ ラジオボタン (section)
       │         ├─ v-divider
       │         ├─ トグルボタン (section)
       │         ├─ v-divider
       │         ├─ プルダウンリスト (section)
       │         ├─ v-divider
       │         ├─ カレンダー (section) + ダイアログ本体
       │         ├─ v-divider
       │         └─ 時刻選択 (section) + ダイアログ本体
       ├─ v-window-item: 表示制御
       │    └─ v-container
       │         └─ 表示制御パターン (section)
       ├─ v-window-item: ダイアログ
       │    └─ v-container
       │         ├─ ダイアログパターン (section) + ダイアログ本体
       ├─ v-window-item: 通知
       │    └─ v-container
       │         └─ 通知・オーバーレイ (section) + snackbar + bottom-sheet
       └─ v-window-item: スキャナー
            └─ v-container
                 └─ バーコードスキャナー (section)
```

---

## 実装メモ

- `v-tabs` と `v-window` は `v-model="activeTab"` で連動させる
- `v-tabs` は `<div style="position: sticky; top: 0; z-index: 1; background: rgb(var(--v-theme-background));">` でラップして sticky 化
- 各 `v-window-item` は `value` を文字列で指定（`"input"`, `"display"`, `"dialog"`, `"notification"`, `"scanner"`）
- ダイアログ・スナックバー・ボトムシートの本体 `<v-dialog>` / `<v-snackbar>` / `<v-bottom-sheet>` は対応する `v-window-item` の末尾に配置
- `<script setup>` のリアクティブ変数・関数はすべてそのまま保持（削除・移動なし）

---

## スコープ外

- コンポーネントカタログとしての自動生成・メタデータ管理
- 各セクションへのディープリンク（URL に tab を反映）
- 新しいコンポーネントサンプルの追加
