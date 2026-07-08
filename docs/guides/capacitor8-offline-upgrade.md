# Capacitor 7 → 8 オフライン環境アップグレード手順書

**対象**: オフライン環境（VSCode + gradle CLI + エミュレータ、Android Studio 不使用）で Capacitor 8 へ更新するための、持ち込み物一覧と手順
**戦略**: オンライン PC で移行を完遂してビルドを通し、その過程で溜まったキャッシュ・SDK の**差分だけ**を zip 化してオフライン環境へ持ち込む。オフライン側では展開と `--offline` ビルドのみ行う
**作成日**: 2026-07-09（バージョンは作業時に最新を再確認すること）

---

## 1. 現状（差分の基準点）

| 項目 | 現在のバージョン | 場所 |
|---|---|---|
| Capacitor (core/cli/android/app/camera) | 7.x（android 7.6.6） | `package.json` |
| AGP | 8.7.2 | `android/build.gradle` |
| Gradle 本体 | 8.11.1 | `android/gradle/wrapper/gradle-wrapper.properties` |
| Android SDK Platform | 35 | `%LOCALAPPDATA%\Android\Sdk\platforms\android-35` |
| minSdk / compileSdk / targetSdk | 23 / 35 / 35 | `android/variables.gradle` |
| Kotlin / KSP | 2.0.21 / 2.0.21-1.0.28 | `android/build.gradle` |
| Room / coroutines | 2.6.1 / 1.9.0 | `android/variables.gradle` |
| JDK | 21（Android Studio 同梱 JBR） | `JAVA_HOME` |
| Node.js | 24 | — |

**変わらないもの（持ち込み不要）**: JDK 21・Node.js・platform-tools(adb)・エミュレータ本体・既存 AVD・システムイメージ。
エミュレータは既存のままで動く（targetSdk 36 のアプリは古い/新しいどちらの OS イメージでも実行可能）。

---

## 2. Capacitor 8 で変わるもの（差分一覧）

| 項目 | 7 → 8 |
|---|---|
| npm パッケージ | `@capacitor/{core,cli,android,app,camera}` を 8.x へ |
| AGP | 8.7.2 → **8.13.0** |
| Gradle 本体 | 8.11.1 → **8.13** |
| SDK Platform | 35 → **36**（build-tools も 36 系） |
| minSdk / compileSdk / targetSdk | 23/35/35 → **24/36/36** |
| Kotlin / KSP | 2.0.21 → **2.2.20** / 対応 KSP（2.2.20-x.y.z 系） |
| Room | 2.6.1 → **2.7 系**（Kotlin 2.2 対応のため） |
| variables.gradle の androidx 群 | §4-2 の表の通り一括更新 |
| Node.js | 22 以上（24 で充足・変更不要） |
| JDK | **21 のまま変更不要** |

> Android Studio は使わないため「Otter 必須」の制約は無関係。AGP Upgrade Assistant がやることを §4 で手動編集する。

---

## 3. 持ち込み zip の内訳（オンライン PC で作る）

オンライン PC で §4 を完了（ビルド成功）させた後、以下を zip 化する。パスは Windows 前提。

| # | zip 対象 | 展開先（オフライン側） | 内容 | サイズ目安 |
|---|---|---|---|---|
| 1 | `%USERPROFILE%\.gradle\wrapper\dists\gradle-8.13-all\` | 同じパス | Gradle 本体（wrapper が展開済みの形） | ~200MB |
| 2 | `%USERPROFILE%\.gradle\caches\modules-2\` | 同じパス | AGP 8.13・Kotlin 2.2.20・KSP・Room 2.7・androidx 等の Maven 成果物 | ~1-2GB |
| 3 | `%LOCALAPPDATA%\Android\Sdk\platforms\android-36\` | 同じパス | SDK Platform 36 | ~60MB |
| 4 | `%LOCALAPPDATA%\Android\Sdk\build-tools\36.0.0\` | 同じパス | Build-Tools 36 | ~60MB |
| 5 | `%LOCALAPPDATA%\Android\Sdk\licenses\` | 同じパス（上書き） | ライセンス承諾ファイル。**無いと SDK を手置きしてもビルドが拒否される** | 数KB |
| 6 | プロジェクトの `node_modules\` + `package.json` + `package-lock.json` | プロジェクト直下 | Capacitor 8 系の npm パッケージ一式 | ~500MB |
| 7 | `android\gradle\wrapper\gradle-wrapper.properties` ほかコード変更 | — | **git 経由で持ち込む**（§4 の編集をコミットしておく） | — |

> **#2 の注意**: `modules-2` は既存キャッシュへの「差分上書き」で問題ない（ファイルは SHA1 ベースで共存する）。丸ごとが重い場合は、オンライン側で一度 `.gradle\caches` を空にしてからビルドすると「今回必要になった分だけ」のクリーンなキャッシュが作れる。
> **#1 の注意**: `dists` 配下のフォルダ名（`gradle-8.13-all`）は `gradle-wrapper.properties` の `distributionUrl` 末尾と一致している必要がある。`-bin` と `-all` を混在させないこと。

---

## 4. オンライン PC での作業手順

### 4-0. 事前確認

```powershell
node --version    # 22 以上
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'   # または任意の JDK 21
```

KSP のバージョンを確定する: https://github.com/google/ksp/releases で
**Kotlin 2.2.20 に対応する最新（`2.2.20-x.y.z` 形式）** を控える。以降 `<KSP_VER>` と表記。

### 4-1. npm パッケージ更新

```powershell
npm install @capacitor/core@8 @capacitor/android@8 @capacitor/app@8 @capacitor/camera@8
npm install -D @capacitor/cli@8
```

> `npx cap migrate` を使うと以降の gradle 編集の大半を自動化できるが、
> 何が変わったか把握するため本書では手動編集の内容も明記する（4-2〜4-4）。

### 4-2. `android/variables.gradle` を更新

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
    coroutinesVersion = '1.10.2'   // 2026-07 時点の安定版。1.9.0 のままでも可
}
```

### 4-3. `android/build.gradle` を更新

```groovy
    dependencies {
        classpath 'com.android.tools.build:gradle:8.13.0'
        classpath 'com.google.gms:google-services:4.4.2'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.2.20'
        classpath 'com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:<KSP_VER>'
    }
```

### 4-4. Gradle wrapper を更新

`android/gradle/wrapper/gradle-wrapper.properties`:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.13-all.zip
```

### 4-5. SDK Platform 36 / Build-Tools 36 を取得

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" "platforms;android-36" "build-tools;36.0.0"
& "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" --licenses   # すべて y
```

### 4-6. 同期とフルビルド（キャッシュを温める）

```powershell
npx cap sync android
& .\android\gradlew.bat -p android :app:assembleDebug
& .\android\gradlew.bat -p android :app:compileDebugAndroidTestKotlin   # DAOテストのコンパイルも通す
npx vitest run
npm run type-check
```

すべて green になったら:

- **コード変更をコミット**（package.json / package-lock.json / android 配下の編集）
- §3 の表に従って zip を作成

> ビルドに失敗する場合の多くは Kotlin/KSP/Room のバージョン不整合。
> KSP は「Kotlin バージョンと完全一致するプレフィックス」、Room は 2.7 系以上を守ること。

---

## 5. オフライン環境での作業手順

1. **git からコード変更を取得**（§4 でコミットした差分）
2. §3 の zip を対応する展開先へ配置
   - `node_modules` はプロジェクト直下へ丸ごと置き換え（`npm install` は実行しない）
   - SDK の `platforms\android-36` / `build-tools\36.0.0` / `licenses` を配置
   - `%USERPROFILE%\.gradle\wrapper\dists\gradle-8.13-all\` と `caches\modules-2\` を配置
3. ビルド確認（**必ず `--offline` を付ける** — ネットに出ようとした時点で失敗させ、キャッシュ漏れを検出する）

```powershell
$env:JAVA_HOME = '<JDK21 のパス>'
npx cap sync android
& .\android\gradlew.bat -p android --offline :app:assembleDebug
& .\android\gradlew.bat -p android --offline :app:installDebug   # エミュレータ起動済みの場合
```

4. エミュレータでの回帰確認（最低限）
   - クイックスキャン: スキャン → draft 保存 → 確定 → アプリ再起動で残存（Room）
   - 戻る操作: 読み取り画面 → 機能選択 → ホーム → 最小化
   - ヘッダーとステータスバーが重ならないこと

---

## 6. トラブルシュート

| 症状 | 原因と対処 |
|---|---|
| `Could not resolve com.android.tools.build:gradle:8.13.0`（--offline 時） | Maven キャッシュ漏れ。オンライン側の `modules-2` を作り直して再持ち込み |
| wrapper が Gradle をダウンロードしようとする | `dists` の展開先フォルダ名と `distributionUrl` の不一致（`-all`/`-bin` 混在が典型） |
| `Failed to install the following SDK components` / license エラー | `Sdk\licenses` フォルダの持ち込み漏れ |
| `Room cannot verify the data integrity`（実行時） | Room 2.7 化とは無関係にスキーマ変更をした場合のみ発生。開発中はアプリのデータ消去で回避（`docs/guides/sqlite-guide.md` §7 参照） |
| KSP エラー `ksp-x.y.z is too old for kotlin-x.y.z` | KSP プレフィックスと Kotlin バージョンの不一致。§4-0 で控えた `<KSP_VER>` を確認 |
| npm が `EBADPLATFORM` 等（node_modules 持ち込み後） | オンライン/オフラインで OS・Node メジャーが異なると native バイナリが合わない。**両環境の Node メジャーを揃える** |

---

## 7. 補足

- **JDK は更新不要**（Capacitor 7 の時点で 21 必須。8 でも同じ）
- Android Studio を使わない CLI 運用のため、「Otter 必須」は本手順には影響しない
- エミュレータのシステムイメージ更新も不要（既存 AVD で動作可）。実案件が Android 13 想定なら、別途 API 33 イメージ（`system-images;android-33;google_apis;x86_64`）を同じ要領で zip 持ち込みして検証用 AVD を作るのも選択肢
- 本プロジェクト固有の注意: Room/KSP/Kotlin は Room 移行（2026-07-08）で導入したもの。バージョンの組を崩さないこと（`docs/superpowers/specs/2026-07-08-room-migration-design.md`）
