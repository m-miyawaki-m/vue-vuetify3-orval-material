# Capacitor 7 → 8 制限ネットワーク環境アップグレード手順書

> **注記（2026-07-12）**: Room/SQLite はプロジェクトから撤去済み（`docs/superpowers/specs/2026-07-12-remove-room-sqlite-design.md`）。本書の Room・Kotlin・KSP に関する手順（バージョン更新・Nexus proxy・データ残存確認・トラブルシューティング）は実施不要。`docs/guides/sqlite-guide.md` も削除済み。

**対象**: 外部接続が制限された環境（VSCode + gradle CLI + エミュレータ、Android Studio は任意）で Capacitor 8 へ更新するための構成と手順
**環境の前提**:
- 外部への直接接続は不可。**Nexus（社内リポジトリマネージャ）経由で dl.google.com 等への到達は可能**
- Gradle 本体（services.gradle.org）は直接取得不可
- プロジェクトファイルは手書きで変更可能

**構成方針**: 「経路A: Nexus 経由で全部賄う（推奨・恒久構成）」を基本とし、Nexus で賄えないものだけ「経路B: zip 持ち込み」で補う。
**作成日**: 2026-07-09（バージョン・URL は作業時に再確認すること）

---

## 1. 現状（差分の基準点）

| 項目 | 現在 | 場所 |
|---|---|---|
| Capacitor (core/cli/android/app/camera) | 7.x（android 7.6.6） | `package.json` |
| AGP | 8.7.2 | `android/build.gradle` |
| Gradle 本体 | 8.11.1 | `android/gradle/wrapper/gradle-wrapper.properties` |
| Android SDK Platform | 35 | `%LOCALAPPDATA%\Android\Sdk\platforms\android-35` |
| minSdk / compileSdk / targetSdk | 23 / 35 / 35 | `android/variables.gradle` |
| Kotlin / KSP | 2.0.21 / 2.0.21-1.0.28 | `android/build.gradle` |
| Room / coroutines | 2.6.1 / 1.9.0 | `android/variables.gradle` |
| JDK | 21 | `JAVA_HOME` |
| Node.js | 24 | — |

**変わらない・作業不要なもの**: JDK 21・Node.js・platform-tools(adb)・エミュレータ本体・既存 AVD・システムイメージ。

---

## 2. Capacitor 8 で変わるもの（差分一覧）

| 項目 | 7 → 8 |
|---|---|
| npm パッケージ | `@capacitor/{core,cli,android,app,camera}` を 8.x へ |
| AGP | 8.7.2 → **8.13.0** |
| Gradle 本体 | 8.11.1 → **8.13** |
| SDK Platform / Build-Tools | 35 → **36 / 36.0.0** |
| minSdk / compileSdk / targetSdk | 23/35/35 → **24/36/36** |
| Kotlin / KSP | 2.0.21 → **2.2.20** / 対応 KSP（`2.2.20-x.y.z` 系） |
| Room | 2.6.1 → **2.7 系**（Kotlin 2.2 対応のため） |
| variables.gradle の androidx 群 | §5-2 の表の通り一括更新 |
| Node.js | 22 以上（充足・変更不要） |
| JDK | **21 のまま変更不要** |

> Android Studio を使う場合も「Otter 必須」は AGP Upgrade Assistant を使う場合の話。本書は全編集を手書きで行うため、CLI 運用なら Studio 更新は不要。

---

## 3. 各ツールの取得先と Nexus での賄い方

**重要**: Android SDK の取得先（`dl.google.com/android/repository/`）と、AGP 等の Maven 取得先（`dl.google.com/dl/android/maven2` = google()）は**別パス**。片方が通っても他方は別判定。

| 何を | 本来の取得先 | Nexus リポジトリ種別 | 差し替え方法 |
|---|---|---|---|
| npm パッケージ | `registry.npmjs.org` | npm (proxy) | `.npmrc` の registry |
| AGP・androidx（google()） | `dl.google.com/dl/android/maven2` | maven2 (proxy) | settings.gradle / init.gradle |
| Kotlin・KSP・Room 等（mavenCentral()） | `repo.maven.apache.org/maven2` | maven2 (proxy) | 同上（group にまとめる） |
| **Gradle 本体** | `services.gradle.org/distributions` | **raw (hosted)** に zip を配置 | wrapper の `distributionUrl` |
| **Android SDK**（Platform 36 等） | `dl.google.com/android/repository/` | **raw (proxy)** | 環境変数 `SDK_TEST_BASE_URL` |

---

## 4. 経路A: Nexus 経由構成（推奨）

以下、Nexus の URL は `https://nexus.example.local/repository/<リポジトリ名>/` をプレースホルダとする。実際のリポジトリ名に読み替えること。

### 4-1. npm を Nexus に向ける

プロジェクト直下（またはユーザーホーム）の `.npmrc`:

```ini
registry=https://nexus.example.local/repository/npm-proxy/
```

### 4-2. Maven（AGP/androidx/Kotlin/Room）を Nexus に向ける

このプロジェクトは `android/settings.gradle` のリポジトリ定義が優先される構成（PREFER_SETTINGS）。方法は2つ、どちらか一方でよい:

**方法1: プロジェクト内で差し替え**（`android/settings.gradle` の `google()` / `mavenCentral()` を置換）:

```groovy
dependencyResolutionManagement {
    repositories {
        maven { url 'https://nexus.example.local/repository/maven-public/' } // google+central の group
    }
}
```

`android/build.gradle` の `buildscript.repositories` も同様に差し替える。

**方法2: コードを触らず全ビルド共通で強制**（`%USERPROFILE%\.gradle\init.gradle`）:

```groovy
def NEXUS = 'https://nexus.example.local/repository/maven-public/'
settingsEvaluated { settings ->
    settings.dependencyResolutionManagement.repositories {
        clear()
        maven { url NEXUS }
    }
}
allprojects {
    buildscript.repositories { clear(); maven { url NEXUS } }
    repositories { clear(); maven { url NEXUS } }
}
```

> チーム全員の環境を揃えるなら方法1（git で共有される）、個人環境の事情なら方法2。

### 4-3. Gradle 本体を Nexus raw リポジトリから配布する

1. オンライン側で `gradle-8.13-all.zip` を入手し、Nexus の **raw hosted** リポジトリにアップロード
2. `android/gradle/wrapper/gradle-wrapper.properties` を差し替え:

```properties
distributionUrl=https\://nexus.example.local/repository/raw-tools/gradle-8.13-all.zip
```

> `dists` キャッシュのフォルダ名は URL のハッシュで決まる。URL を後から変えると再ダウンロードになるため、最初にチームで URL を確定させること。

### 4-4. Android SDK を Nexus 経由で取得する（SDK_TEST_BASE_URL）

sdkmanager / Android Studio の SDK Manager は取得先ベース URL を GUI では差し替えられないが、
**環境変数 `SDK_TEST_BASE_URL`**（非公開だがミラー運用の定番）で差し替え可能。Studio と CLI の両方に効く。

1. Nexus に `dl.google.com/android/` の **raw proxy** を作る
2. まずカタログ XML が取れるか確認（パス構造の検証）:

```powershell
curl.exe -sI https://nexus.example.local/repository/android-dl-proxy/repository/repository2-3.xml
# 200 が返ること
```

3. 環境変数を設定（Studio 利用者はシステム/ユーザー環境変数にして Studio 再起動）:

```powershell
[Environment]::SetEnvironmentVariable('SDK_TEST_BASE_URL',
  'https://nexus.example.local/repository/android-dl-proxy/', 'User')
```

4. 取得:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" --list   # 一覧が出れば経路OK
& "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" "platforms;android-36" "build-tools;36.0.0"
& "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" --licenses   # すべて y（ローカル処理）
```

**注意**: `SDK_TEST_BASE_URL` は非公式のため、Studio/cmdline-tools のバージョンアップで挙動が変わるリスクがある。セットアップ手順に上記 `--list` での疎通確認を必ず含めること。

### 4-5. Android Studio 本体について

- Studio の「HTTP Proxy」設定はフォワードプロキシ専用で、Nexus には向けられない（Nexus はフォワードプロキシではない）
- 「SDK Update Sites」タブはアドオンサイトの追加のみで、メインリポジトリ URL は編集不可
- → **SDK 取得の差し替え手段は 4-4 の環境変数一択**。Studio 本体・プラグインのアップデートは別経路（オフライン更新 or 諦め）

---

## 5. コード変更手順（経路A/B 共通）

### 5-0. 事前確認

KSP のバージョンを確定する: https://github.com/google/ksp/releases で
**Kotlin 2.2.20 に対応する最新（`2.2.20-x.y.z` 形式）** を控える。以降 `<KSP_VER>` と表記。

### 5-1. npm パッケージ更新

```powershell
npm install @capacitor/core@8 @capacitor/android@8 @capacitor/app@8 @capacitor/camera@8
npm install -D @capacitor/cli@8
```

### 5-2. `android/variables.gradle`

```groovy
ext {
    minSdkVersion = 24
    compileSdkVersion = 36
    targetSdkVersion = 36
    androidxActivityVersion = '1.11.0'
    androidxAppCompatVersion = '1.7.1'
    androidxCoordinatorLayoutVersion = '1.3.0'
    androidxCoreVersion = '1.17.0'
    androidxFragmentVersion = '1.8.9'
    coreSplashScreenVersion = '1.2.0'
    androidxWebkitVersion = '1.14.0'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.3.0'
    androidxEspressoCoreVersion = '3.7.0'
    cordovaAndroidVersion = '14.0.1'
    roomVersion = '2.7.1'          // Kotlin 2.2 対応のため 2.6.1 から更新
    coroutinesVersion = '1.10.2'   // 安定版。1.9.0 のままでも可
}
```

### 5-3. `android/build.gradle`

```groovy
    dependencies {
        classpath 'com.android.tools.build:gradle:8.13.0'
        classpath 'com.google.gms:google-services:4.4.2'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.2.20'
        classpath 'com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:<KSP_VER>'
    }
```

### 5-4. Gradle wrapper（経路Aなら 4-3 の Nexus URL、経路Bなら公式 URL のまま）

---

## 6. ビルドと回帰確認

```powershell
$env:JAVA_HOME = '<JDK21 のパス>'
npx cap sync android
& .\android\gradlew.bat -p android :app:assembleDebug
& .\android\gradlew.bat -p android :app:compileDebugAndroidTestKotlin   # DAO テストのコンパイル
npx vitest run
npm run type-check
& .\android\gradlew.bat -p android :app:installDebug   # エミュレータ起動済みの場合
```

エミュレータでの回帰確認（最低限）:
- クイックスキャン: スキャン → draft 保存 → 確定 → アプリ再起動で残存（Room）
- 戻る操作: 読み取り画面 → 機能選択 → ホーム → 最小化
- ヘッダーとステータスバーが重ならないこと

---

## 7. 経路B: zip 持ち込み（Nexus で賄えないものへのフォールバック）

オンライン PC で §5 を完了しビルドを通した後、必要な分だけ zip 化して持ち込む。

| # | zip 対象 | 展開先 | 補足 |
|---|---|---|---|
| 1 | `%USERPROFILE%\.gradle\wrapper\dists\gradle-8.13-all\` | 同じパス | `distributionUrl` は取得時と同一にすること（フォルダ名が URL ハッシュ由来） |
| 2 | `%USERPROFILE%\.gradle\caches\modules-2\` | 同じパス | Maven 成果物。既存キャッシュへの上書き共存可。クリーンに作るならオンライン側で caches を空にしてからビルド |
| 3 | `%LOCALAPPDATA%\Android\Sdk\platforms\android-36\` | 同じパス | zip の直 URL は `repository2-3.xml` 内に列挙（`platform-36_rXX.zip` 等） |
| 4 | `%LOCALAPPDATA%\Android\Sdk\build-tools\36.0.0\` | 同じパス | 同上 |
| 5 | `%LOCALAPPDATA%\Android\Sdk\licenses\` | 同じパス | **持ち込み漏れが最頻出の罠**（SDK を手置きしてもビルド拒否される） |
| 6 | `node_modules\` + `package.json` + `package-lock.json` | プロジェクト直下 | 両環境の OS・Node メジャーを揃えること（native バイナリ差異対策） |

持ち込み後のビルドは **`--offline` を付けて実行**し、ネットに出ようとした時点で失敗させてキャッシュ漏れを検出する:

```powershell
& .\android\gradlew.bat -p android --offline :app:assembleDebug
```

---

## 8. トラブルシュート

| 症状 | 原因と対処 |
|---|---|
| `Could not resolve com.android.tools.build:gradle:8.13.0` | Nexus の group に google proxy が入っていない / 経路Bならキャッシュ漏れ |
| wrapper が Gradle をダウンロードしようとして失敗 | `distributionUrl` が Nexus raw に向いていない、または `dists` フォルダ名と URL の不一致（`-all`/`-bin` 混在が典型） |
| sdkmanager --list が空・タイムアウト | `SDK_TEST_BASE_URL` のパス構造不一致。§4-4 手順2の curl で `repository2-3.xml` が 200 になるまで URL を調整 |
| SDK license エラー | `sdkmanager --licenses` 未実行（経路A）/ `Sdk\licenses` 持ち込み漏れ（経路B） |
| KSP エラー `ksp-x.y.z is too old for kotlin-x.y.z` | KSP プレフィックスと Kotlin バージョンの不一致。`<KSP_VER>` を再確認 |
| npm install が公式 registry に出ようとする | `.npmrc` の置き場所（プロジェクト直下 or `%USERPROFILE%`）と `registry=` 行を確認 |
| `Room cannot verify the data integrity`（実行時） | スキーマ変更時の version 据え置き。開発中はアプリのデータ消去で回避（`docs/guides/sqlite-guide.md` §7） |

---

## 9. 補足

- **JDK は更新不要**（Capacitor 7 の時点で 21 必須。8 でも同じ）
- **Android Studio 更新も CLI 運用なら不要**（AGP Upgrade Assistant 相当は §5 の手書き編集で完結）
- エミュレータのシステムイメージ更新も不要（既存 AVD で動作可）。実案件が Android 13 想定なら、検証用に `system-images;android-33;google_apis;x86_64` を同じ経路（4-4 または zip）で取得して API 33 AVD を作るのも選択肢
- 本プロジェクト固有: Room/KSP/Kotlin は Room 移行（2026-07-08）で導入（`docs/superpowers/specs/2026-07-08-room-migration-design.md`）。Kotlin を上げるときは KSP・Room を必ずセットで追従させること
