# Capacitor 8 移行時の package.json バージョン検討書

**目的**: Capacitor 7 → 8 移行で `package.json` の各依存をどのバージョンにするかの検討と決定
**調査日**: 2026-07-09（npm レジストリ実測。実施時に最新パッチを再確認すること）
**関連**: 環境更新手順は `docs/guides/capacitor8-offline-upgrade.md`

---

## 1. 決定（結論）

`package.json` の変更は **Capacitor 系5パッケージのみ**。他の依存は一切変更しない。

### dependencies

| パッケージ | 現在 | **決定** | 根拠 |
|---|---|---|---|
| `@capacitor/core` | ^7.6.6 | **^8.4.1** | 調査時点の 8 系最新 |
| `@capacitor/android` | ^7.6.6 | **^8.4.1** | core と**同一バージョン必須**（peer: `@capacitor/core: ^8.4.0`） |
| `@capacitor/app` | ^7.1.2 | **^8.1.0** | 8 系最新。peer は `core >= 8.0.0` なので core 8.4.x と共存可 |
| `@capacitor/camera` | ^7.0.5 | **^8.2.1** | 同上 |

### devDependencies

| パッケージ | 現在 | **決定** | 根拠 |
|---|---|---|---|
| `@capacitor/cli` | ^7.6.6（dependencies に配置） | **^8.4.1（devDependencies へ移動）** | core/android と同一バージョンで揃える。CLI はビルドツールであり実行時依存ではないため、この機会に devDependencies へ移すのが正位置（移動しなくても動作には影響なし） |

### 適用コマンド

```powershell
npm install @capacitor/core@8.4.1 @capacitor/android@8.4.1 @capacitor/app@8.1.0 @capacitor/camera@8.2.1
npm uninstall @capacitor/cli
npm install -D @capacitor/cli@8.4.1
```

---

## 2. バージョン選定の考え方

### 2-1. core / android / cli は「同一バージョンで揃える」（最重要）

`@capacitor/android@8.4.1` の peerDependencies は `@capacitor/core: ^8.4.0`（**マイナーまで一致要求**）。
`core` だけ 8.0.x に据え置く、といった組み合わせは peer 解決エラーになる。
**3点（core / android / cli）は常に同じ番号で上げ下げする**、が運用ルール。

### 2-2. app / camera は独立した番号を持つ

プラグインはコアとリリースサイクルが別（調査時点: app 8.1.0 / camera 8.2.1）。
peer は `core >= 8.0.0` と緩いため、「8 系の各最新」を選べばよい。
番号がコア（8.4.x）と揃わないのは正常であり、無理に合わせる番号は存在しない。

### 2-3. `^`（キャレット）は維持し、固定は package-lock.json に任せる

- 本プロジェクトの既存スタイル（全依存 `^`）を踏襲する
- 再現性は `package-lock.json` が担保する。制限ネットワーク環境（Nexus 経由/持ち込み）では
  **lock を含めて git 管理 + `npm ci` 相当の運用**が本質であり、`^` を外して得るものはない
- 実案件でバージョン凍結ポリシーがある場合のみ、Capacitor 5点を exact 固定（`8.4.1` 等）に切り替える

### 2-4. 実行環境要件の確認結果

| 要件 | 要求 | この環境 | 判定 |
|---|---|---|---|
| Node.js（`@capacitor/cli@8` の engines） | >= 22.0.0 | 24.x | ✓ |
| `@capacitor/core` のランタイム依存 | tslib ^2.1.0 のみ | 解決済み | ✓ |

---

## 3. 変更しない依存（確認済み）

以下はすべて **Capacitor に依存しておらず、Capacitor 8 移行の影響を受けない**。今回の移行では触らない
（それぞれの更新は別件として判断する）。

| 分類 | パッケージ | Capacitor と無関係である理由 |
|---|---|---|
| UI フレームワーク | vue / vue-router / vuetify / pinia / pinia-plugin-persistedstate / vuedraggable | Capacitor は WebView に静的アセット（dist/）を載せるだけで、フロントエンドのフレームワーク選定に関与しない |
| データ取得 | @tanstack/vue-query / axios / zod / orval | 同上（HTTP・スキーマ層は WebView 内で完結） |
| スキャナー | @zxing/browser | ブラウザ標準 API（getUserMedia）のみ使用。Capacitor プラグインではない |
| フォント・アイコン | @fontsource/roboto / @mdi/font / material-icons / unplugin-fonts | 静的アセット |
| ビルド・テスト | vite / vitest / @playwright/test / eslint / prettier / typescript / vue-tsc / sass ほか devDependencies 全般 | Web 資産のビルドチェーン。Capacitor は成果物（dist/）を受け取るだけ |

> 注意: `@capacitor-community/sqlite` は Room 移行（2026-07-08）で撤去済みのため、
> 「8 系にしないと使えない」問題は既に存在しない。

---

## 4. 適用後の検証

```powershell
npm ls @capacitor/core @capacitor/android @capacitor/cli @capacitor/app @capacitor/camera
# → 5点が 8 系で、peer エラーが出ないこと

npx cap doctor
# → @capacitor/* の整合チェック

npx cap sync android
# → android/ 側の生成物（capacitor.settings.gradle 等）が 8 系プラグインで再生成される
```

その後のネイティブ側（AGP/Gradle/SDK/Kotlin）の更新は `capacitor8-offline-upgrade.md` §5 へ続く。

---

## 5. 将来の更新時のメモ

- パッチ更新（8.4.1 → 8.4.x）: core/android/cli の3点セットで同時に上げる。app/camera は独立に上げてよい
- `npm view @capacitor/android@8 version` で 8 系の最新番号を確認できる
- Capacitor 9 が出た後は、8 系のメンテナンス期限（通例、次メジャー後 約1年）を意識して次回計画を立てる
