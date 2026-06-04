# Library Setup (Capacitor 7 移行) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存プロジェクトを Capacitor 7 ベースに移行し、カメラプラグイン・orval・axios を追加、VSCode タスクと orval 設定ファイルを整備する。

**Architecture:** package.json の Capacitor を v8 → v7 に変更後、android ディレクトリを削除して Cap 7 版として再生成する。VSCode tasks.json は設計ドキュメント通りの全ワークフロー（ブラウザ開発・livereload・APK ビルド）を定義する。orval.config.ts は API クライアント生成の準備のみ行い、実際のコード生成はしない。

**Tech Stack:** Vue 3, Vuetify 4, Capacitor 7, @capacitor/camera 7, Vite 8, orval, axios, Android SDK (AGP ~8.5-8.7, Java 17)

**Design Doc:** `docs/superpowers/specs/2026-06-05-android-build-env-design.md`

---

## File Map

| 操作 | パス | 内容 |
|---|---|---|
| 修正 | `package.json` | Cap ^8 → ^7、camera・orval・axios 追加 |
| 作成 | `.vscode/tasks.json` | 全開発ワークフロータスク定義 |
| 作成 | `orval.config.ts` | orval 最小設定（コード生成なし） |
| 削除→再生成 | `android/` | Cap 7 版として再生成 |

---

## Task 1: Capacitor を v7 に更新し camera・orval・axios を追加

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Capacitor v7 および追加パッケージをインストール**

作業ディレクトリ: `C:\dev\vue-vuetify3-orval-material`

```powershell
npm install @capacitor/core@7 @capacitor/cli@7 @capacitor/android@7 @capacitor/camera@7 axios
npm install --save-dev orval
```

- [ ] **Step 2: package.json のバージョンを確認**

```powershell
node -e "const p=require('./package.json'); ['@capacitor/core','@capacitor/cli','@capacitor/android','@capacitor/camera','axios'].forEach(k=>console.log(k, p.dependencies[k])); console.log('orval', p.devDependencies.orval)"
```

期待される出力（バージョン番号は最新の 7.x.x）:
```
@capacitor/core ^7.x.x
@capacitor/cli ^7.x.x
@capacitor/android ^7.x.x
@capacitor/camera ^7.x.x
axios ^1.x.x
orval ^7.x.x (or latest)
```

- [ ] **Step 3: コミット**

```powershell
git add package.json package-lock.json
git commit -m "chore: migrate capacitor v8 to v7, add camera/orval/axios"
```

---

## Task 2: android ディレクトリを Cap 7 で再生成

**Files:**
- Delete: `android/`
- Regenerate: `android/` (Cap 7 版)

- [ ] **Step 1: android ディレクトリを削除**

```powershell
Remove-Item -Recurse -Force android
```

- [ ] **Step 2: Vite ビルドを実行（dist/ を用意）**

```powershell
npm run build
```

期待される出力:
```
dist/ ディレクトリが生成される（エラーなし）
```

- [ ] **Step 3: Cap 7 で android プラットフォームを追加**

```powershell
npx cap add android
```

期待される出力:
```
✔ Adding native android project in android in Xms.
✔ Syncing Gradle
...
[success] android platform added!
```

- [ ] **Step 4: 生成された android/build.gradle の AGP バージョンを確認**

```powershell
Select-String "com.android.tools.build:gradle" android\build.gradle
```

期待される出力（AGP は 8.5.x〜8.7.x の範囲）:
```
classpath 'com.android.tools.build:gradle:8.x.x'
```

> AGP が 8.8 以上の場合は Android Studio Ladybug で動作しない可能性がある。その場合は `android/build.gradle` の classpath バージョンを `8.7.3` に手動で書き換える。

- [ ] **Step 5: 生成された capacitor.build.gradle の Java バージョンを確認**

```powershell
Select-String "JavaVersion" android\app\capacitor.build.gradle
```

期待される出力:
```
sourceCompatibility JavaVersion.VERSION_17
targetCompatibility JavaVersion.VERSION_17
```

> `VERSION_21` が出た場合は Cap 7 が正しく使われていない。Task 1 のインストールを確認すること。

- [ ] **Step 6: cap sync を実行して android プロジェクトを最新化**

```powershell
npx cap sync android
```

期待される出力:
```
✔ Copying web assets from dist to android\app\src\main\assets\public
✔ Updating Android plugins
...
[success] Done.
```

- [ ] **Step 7: コミット**

```powershell
git add android
git commit -m "chore: regenerate android directory with capacitor 7"
```

---

## Task 3: .vscode/tasks.json を追加

**Files:**
- Create: `.vscode/tasks.json`

- [ ] **Step 1: .vscode ディレクトリを作成（なければ）**

```powershell
New-Item -ItemType Directory -Force .vscode
```

- [ ] **Step 2: tasks.json を作成**

`.vscode/tasks.json` を以下の内容で作成:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "dev:browser",
      "type": "shell",
      "command": "npm run dev",
      "presentation": { "reveal": "always", "panel": "new" },
      "problemMatcher": [],
      "detail": "Mode 1: Vite dev server をブラウザで開く"
    },
    {
      "label": "build:web",
      "type": "shell",
      "command": "npm run build",
      "problemMatcher": ["$tsc"],
      "detail": "Vite プロダクションビルド"
    },
    {
      "label": "cap:sync",
      "type": "shell",
      "command": "npx cap sync android",
      "dependsOn": "build:web",
      "problemMatcher": [],
      "detail": "ビルド後に Android プロジェクトへ反映"
    },
    {
      "label": "emulator:start",
      "type": "shell",
      "command": "${env:ANDROID_HOME}/emulator/emulator -avd Pixel6_API33",
      "presentation": { "reveal": "always", "panel": "new" },
      "isBackground": true,
      "problemMatcher": [],
      "detail": "AVD を起動（エミュレータ画面が別ウィンドウで開く）"
    },
    {
      "label": "android:livereload",
      "type": "shell",
      "command": "npx cap run android --livereload --external",
      "presentation": { "reveal": "always", "panel": "new" },
      "problemMatcher": [],
      "detail": "Mode 2: Vite dev server + APK デプロイ（HMR 有効）"
    },
    {
      "label": "android:build:debug",
      "type": "shell",
      "command": ".\\gradlew.bat assembleDebug",
      "options": { "cwd": "${workspaceFolder}/android" },
      "dependsOn": "cap:sync",
      "problemMatcher": [],
      "detail": "Mode 3: デバッグ APK をビルド"
    },
    {
      "label": "android:install:debug",
      "type": "shell",
      "command": "adb install -r android/app/build/outputs/apk/debug/app-debug.apk",
      "problemMatcher": [],
      "detail": "Mode 3: 接続中のデバイスに APK をインストール"
    },
    {
      "label": "android:open",
      "type": "shell",
      "command": "npx cap open android",
      "dependsOn": "cap:sync",
      "problemMatcher": [],
      "detail": "Mode 4: Android Studio でリリースビルド・署名・Logcat"
    }
  ]
}
```

- [ ] **Step 3: JSON が有効であることを確認**

```powershell
node -e "require('./.vscode/tasks.json'); console.log('JSON valid')"
```

期待される出力:
```
JSON valid
```

- [ ] **Step 4: コミット**

```powershell
git add .vscode/tasks.json
git commit -m "chore: add vscode tasks for browser dev / livereload / android build"
```

---

## Task 4: orval.config.ts を追加

**Files:**
- Create: `orval.config.ts`

- [ ] **Step 1: orval.config.ts を作成**

プロジェクトルートに `orval.config.ts` を以下の内容で作成:

```typescript
import { defineConfig } from 'orval'

export default defineConfig({
  // API クライアントを追加する場合はここに定義する
  // 例:
  // myApi: {
  //   input: './openapi.json',
  //   output: {
  //     target: './src/api/myApi.ts',
  //     client: 'axios',
  //   },
  // },
})
```

- [ ] **Step 2: TypeScript がエラーを出さないことを確認**

```powershell
npx vue-tsc --noEmit
```

期待される出力:
```
（エラーなし・警告なし）
```

- [ ] **Step 3: コミット**

```powershell
git add orval.config.ts
git commit -m "chore: add orval config skeleton for future API client generation"
```

---

## Task 5: 最終動作確認

- [ ] **Step 1: クリーンビルドが通ることを確認**

```powershell
npm run build
```

期待される出力:
```
dist/ が生成される（エラーなし）
```

- [ ] **Step 2: cap sync が通ることを確認**

```powershell
npx cap sync android
```

期待される出力:
```
[success] Done.
```

- [ ] **Step 3: VSCode タスク一覧を確認**

VSCode で `Ctrl+Shift+P` → `Tasks: Run Task` を実行し、以下のタスクが表示されることを確認:

```
dev:browser
build:web
cap:sync
emulator:start
android:livereload
android:build:debug
android:install:debug
android:open
```

- [ ] **Step 4: 最終コミット（変更がある場合）**

```powershell
git add -A
git status  # 確認してから
git commit -m "chore: finalize cap7 library setup"
```

---

## オフライン持ち込みパッケージ化の注意

Task 2 完了後、オンライン機での Gradle キャッシュ育成が必要。

```powershell
# android:build:debug タスクを一度実行してキャッシュを育成
# その後 %USERPROFILE%\.gradle を offline-package に含める
```

詳細手順は設計ドキュメント参照:
`docs/superpowers/specs/2026-06-05-android-build-env-design.md` セクション 6
