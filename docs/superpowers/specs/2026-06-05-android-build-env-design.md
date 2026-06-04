# Android ビルド・エミュレータ環境設計

**日付**: 2026-06-05  
**対象プロジェクト**: Vue 3 + Vuetify 4 + Capacitor 7  
**対象デバイス**: Android 13 (Xnavis 業務ハンドヘルド)、WebView 120-130

---

## 1. バージョン構成

| ツール | バージョン | 根拠 |
|---|---|---|
| Android Studio | Ladybug (2024.2.1) | メモリ制約・AGP 8.5-8.7 対応範囲 |
| JDK | **21** (Android Studio 内蔵 JBR 21 を使用) | @capacitor/android 7.6.6 が VERSION_21 を生成するため。別途インストール不要 |
| AGP (Android Gradle Plugin) | **8.7.2** | Capacitor 7.6.6 デフォルト生成値（Ladybug 互換） |
| Gradle | ~8.7 | AGP 8.7 対応 |
| Capacitor | **7.6.6** (N-1 サポート) | Java 21 互換・安定版 |
| compileSdk / targetSdk | 35 (Android 15) | Capacitor 7 デフォルト |
| minSdk | 23 (Android 6.0) | Capacitor 7 デフォルト |
| Node.js | 22 LTS | Vue 3 / Vite 推奨 |
| Vite | ^5 or ^6 | Capacitor 7 と相性よい安定版 |
| Vuetify | 4.x | 対象フレームワーク |

> WebView 120-130 on Android 13 は compileSdk 35 / minSdk 23 でカバーされる。  
> Capacitor 6 は EOL のため選択肢から除外。Capacitor 8 は AGP 8.13.0 必須で Ladybug 非対応。

---

## 2. 開発ツール役割分担

| ツール | 役割 |
|---|---|
| **VSCode** | 主開発ツール。全ワークフローを tasks.json から実行 |
| **Android Studio** | インストール済み・必要時のみ使用（Logcat・APK署名・AVD管理等） |

普段の開発は **VSCode のみで完結** する。Android Studio は起動しなくてよい。

---

## 3. 開発ワークフロー

### Mode 1: ブラウザ開発（普段）

```
VSCode: task → dev:browser
  └─ Vite dev server が localhost:5173 で起動
  └─ Chrome / Edge でUI確認
  └─ カメラ等ネイティブ機能はこのモードでは動作しない
```

### Mode 2: ネイティブ機能確認（livereload）

```
① VSCode: task → emulator:start
     └─ AVD がエミュレータ画面として起動（別ウィンドウ）
     または USB デバッグ有効の実機を接続

② VSCode: task → android:livereload
     └─ Vite dev server が 0.0.0.0:5173 で起動
     └─ APK がエミュレータ / 実機にデプロイ
     └─ WebView が PC の Vite server に接続
     └─ コード変更 → HMR で即時反映
     └─ カメラ等ネイティブ機能も使える

③ Chrome で chrome://inspect → WebView リモートデバッグ
```

> 実機（Xnavis）使用時: 実機と PC が同じ LAN にいること。  
> Windows Defender でポート 5173 の受信を許可すること。

### Mode 3: APK ビルド → デバイスインストール

```
VSCode: task → android:build:debug
  └─ build:web (Vite) → cap:sync → gradlew.bat assembleDebug

VSCode: task → android:install:debug
  └─ adb install で接続デバイスにインストール
```

### Mode 4: Android Studio を使う場合（高度な作業）

```
VSCode: task → android:open
  └─ build:web → cap:sync → npx cap open android
  └─ Android Studio でリリースビルド・署名・Logcat確認
```

---

## 4. VSCode tasks.json

`.vscode/tasks.json` に以下を定義する。

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

---

## 5. 環境変数（Windows システム環境変数）

```
JAVA_HOME    = C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot
ANDROID_HOME = C:\Users\<username>\AppData\Local\Android\Sdk

PATH に追加:
  %JAVA_HOME%\bin
  %ANDROID_HOME%\platform-tools
  %ANDROID_HOME%\cmdline-tools\latest\bin
  %ANDROID_HOME%\emulator
```

---

## 6. オフライン環境への持ち込み手順

### フェーズ 1: オンライン機でキャッシュ育成

1. JDK 17 / Android Studio Ladybug / Node.js 22 / VSCode をインストール
2. 環境変数を設定
3. Android Studio SDK Manager で以下をインストール:
   - `platforms/android-33` (実機ターゲット)
   - `platforms/android-35` (compileSdk)
   - `build-tools/35.x.x`
   - `platform-tools` / `cmdline-tools/latest` / `emulator`
   - `system-images/android-33/google_apis/x86_64` (AVD 用)
4. AVD Manager で `Pixel6_API33` (API 33 / Google APIs / x86_64) を作成・起動確認
5. プロジェクト作成 + `npm run build` + `npx cap sync android` + Android Studio で Gradle sync 完走

### フェーズ 2: パッケージ化（合計 ~8-10GB）

```
📦 offline-package/
├── installers/
│   ├── jdk-17_windows-x64_bin.msi
│   ├── android-studio-2024.2.1.xx-windows.exe
│   ├── node-v22.x.x-x64.msi
│   └── VSCodeSetup-x64.exe
├── android-sdk/       %ANDROID_HOME% をそのままコピー       (~3GB)
├── gradle-cache/      %USERPROFILE%\.gradle をそのままコピー (~1-2GB)
├── avd/               %USERPROFILE%\.android\avd\ をコピー  (~200MB)
├── vscode-extensions/ Vue.volar-x.x.x.vsix 等
└── project/           node_modules ごとプロジェクト一式     (~500MB)
```

### フェーズ 3: オフライン機での展開

```powershell
# 1. インストーラを順番に実行
#    JDK 17 → Node.js 22 → Android Studio Ladybug → VSCode

# 2. SDK・キャッシュを復元
xcopy /E /I offline-package\android-sdk  "$env:LOCALAPPDATA\Android\Sdk"
xcopy /E /I offline-package\gradle-cache "$env:USERPROFILE\.gradle"
xcopy /E /I offline-package\avd          "$env:USERPROFILE\.android\avd"

# 3. 環境変数を設定（JAVA_HOME / ANDROID_HOME / PATH）

# 4. Gradle をオフラインモードに固定
Add-Content "$env:USERPROFILE\.gradle\gradle.properties" "org.gradle.offline=true"

# 5. Android Studio: Settings → Build → Gradle → Offline work にチェック

# 6. プロジェクト展開
xcopy /E /I offline-package\project C:\dev\my-app

# 7. local.properties の sdk.dir をオフライン機のパスに書き換え
#    android/local.properties:
#    sdk.dir=C:\\Users\\<オフライン機ユーザー名>\\AppData\\Local\\Android\\Sdk

# 8. VSCode 拡張をインストール
code --install-extension vscode-extensions\Vue.volar-x.x.x.vsix
```

### オフライン機 動作確認チェックリスト

```
□ JAVA_HOME / ANDROID_HOME / PATH が設定されている
□ android/local.properties の sdk.dir がオフライン機のパスになっている
□ ~/.gradle/gradle.properties に org.gradle.offline=true がある
□ Android Studio → Gradle → Offline work にチェックが入っている
□ task → emulator:start でエミュレータ画面が起動する
□ task → android:build:debug で APK がビルドできる
□ task → android:livereload でエミュレータに APK がデプロイされる
```

---

## 7. VSCode 推奨拡張（最小構成）

| 拡張 ID | 用途 |
|---|---|
| `Vue.volar` | Vue 3 / TypeScript 補完 |

---

## 8. プロジェクト再作成コマンド

```powershell
npm create vue@latest my-app
cd my-app
npm install vuetify@^4 vite-plugin-vuetify @mdi/font
npm install @capacitor/core@^7 @capacitor/cli@^7 @capacitor/android@^7
npx cap init "VuetifyPoC" "com.example.myapp" --web-dir dist
npx cap add android
npm run build
npx cap sync android
```
