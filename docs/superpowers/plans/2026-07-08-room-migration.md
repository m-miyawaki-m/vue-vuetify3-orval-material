# クイックスキャン DB の Room 移行 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** クイックスキャンのローカル DB を TS 直叩き（`@capacitor-community/sqlite`）から Kotlin + Room に置き換える。

**Architecture:** `scanRecordRepository.ts` の8関数のシグネチャを維持したまま、中身をローカル Capacitor プラグイン（`ScanRecord`）呼び出しに差し替える。SQL は Room DAO（Kotlin）へ移動し、外部キー CASCADE・`@Transaction`・suspend 関数を活用する。画面・composable は無変更。

**Tech Stack:** Kotlin 2.0.21 / KSP 2.0.21-1.0.28 / Room 2.6.1 / kotlinx-coroutines 1.9.0 / Capacitor 7（AGP 8.7.2, compileSdk 35, Java 21）/ Vue 3 + vitest

**Spec:** `docs/superpowers/specs/2026-07-08-room-migration-design.md`

## Global Constraints

- ネイティブ言語は Kotlin。パッケージは `com.example.myapp.db`（プラグイン本体のみ `com.example.myapp`）
- DB 名は `quick_scan.db`。旧 `quick_scanSQLite.db` は放置（移行しない）
- `scanRecordRepository.ts` の8関数のシグネチャ（引数・戻り値型）は変更禁止
- プラグインは camelCase の JSON を返す（TS 側での snake_case 変換は行わない）
- Web プラットフォームでは repository 入口で throw するエラーメッセージを正確に `SQLite はブラウザでは利用できません。エミュレータまたは実機で確認してください` とする（現行と同一）
- gradle CLI 実行前に必ず `$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'` を設定する（Java 21 必須。設定しないと `21は無効なソース・リリースです` で失敗する）
- gradle コマンドはリポジトリルートから `& .\android\gradlew.bat -p android <task>` の形で実行する

---

### Task 1: Gradle 設定（Kotlin + KSP + Room 依存の追加）

**Files:**
- Modify: `android/build.gradle`（buildscript classpath 2行追加）
- Modify: `android/variables.gradle`（バージョン変数2つ追加）
- Modify: `android/app/build.gradle`（プラグイン適用・kotlinOptions・依存追加）

**Interfaces:**
- Consumes: なし
- Produces: 以降のタスクで Kotlin ソース（`src/main/java/**/*.kt`）と `ksp` による Room アノテーション処理がビルド可能になる

- [ ] **Step 1: android/build.gradle の buildscript に Kotlin と KSP の classpath を追加**

`dependencies` ブロックを以下のように変更（google-services の下に2行追加）:

```groovy
    dependencies {
        classpath 'com.android.tools.build:gradle:8.7.2'
        classpath 'com.google.gms:google-services:4.4.2'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.0.21'
        classpath 'com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:2.0.21-1.0.28'

        // NOTE: Do not place your application dependencies here; they belong
        // in the individual module build.gradle files
    }
```

※ `variables.gradle` は buildscript の後に apply されるため、classpath のバージョンは直書きする。

- [ ] **Step 2: android/variables.gradle にバージョン変数を追加**

`ext` ブロック末尾（`cordovaAndroidVersion` の下）に追加:

```groovy
    roomVersion = '2.6.1'
    coroutinesVersion = '1.9.0'
```

- [ ] **Step 3: android/app/build.gradle にプラグイン適用・kotlinOptions・依存を追加**

先頭を以下に変更:

```groovy
apply plugin: 'com.android.application'
apply plugin: 'org.jetbrains.kotlin.android'
apply plugin: 'com.google.devtools.ksp'
```

`android { ... }` ブロック内の `buildTypes { ... }` の後に追加（Capacitor 7 の Java 21 に合わせる）:

```groovy
    kotlinOptions {
        jvmTarget = '21'
    }
```

`dependencies { ... }` に追加（`implementation project(':capacitor-android')` の下）:

```groovy
    implementation "androidx.room:room-runtime:$roomVersion"
    implementation "androidx.room:room-ktx:$roomVersion"
    ksp "androidx.room:room-compiler:$roomVersion"
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:$coroutinesVersion"
```

- [ ] **Step 4: ビルドが通ることを確認**

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
& .\android\gradlew.bat -p android :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`（Kotlin ソースはまだ無いが、プラグイン適用と依存解決が検証される）

- [ ] **Step 5: Commit**

```powershell
git add android/build.gradle android/variables.gradle android/app/build.gradle
git commit -m "build: Kotlin + KSP + Room の Gradle 設定を追加"
```

---

### Task 2: Room Entity と Relation の定義

**Files:**
- Create: `android/app/src/main/java/com/example/myapp/db/ScanSetEntity.kt`
- Create: `android/app/src/main/java/com/example/myapp/db/ScanItemEntity.kt`
- Create: `android/app/src/main/java/com/example/myapp/db/ScanSetWithItems.kt`

**Interfaces:**
- Consumes: Task 1 の Room 依存
- Produces: `ScanSetEntity(id, featureId, status, createdAt, confirmedAt)` / `ScanItemEntity(id, setId, seq, itemKey, value, format, scannedAt)` / `ScanSetWithItems(set, items)` — Task 3 の DAO と Task 4 のプラグインが使用

- [ ] **Step 1: ScanSetEntity.kt を作成**

```kotlin
package com.example.myapp.db

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/** scan_sets テーブル。列名・型は旧 TS 実装のスキーマと同一（日時は ISO 8601 文字列） */
@Entity(
    tableName = "scan_sets",
    indices = [Index(value = ["feature_id", "status"])],
)
data class ScanSetEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "feature_id") val featureId: String,
    val status: String, // 'draft' | 'confirmed'
    @ColumnInfo(name = "created_at") val createdAt: String,
    @ColumnInfo(name = "confirmed_at") val confirmedAt: String?,
)
```

- [ ] **Step 2: ScanItemEntity.kt を作成（外部キー CASCADE + index）**

```kotlin
package com.example.myapp.db

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/** scan_items テーブル。親セット削除で items も消える（CASCADE） */
@Entity(
    tableName = "scan_items",
    foreignKeys = [
        ForeignKey(
            entity = ScanSetEntity::class,
            parentColumns = ["id"],
            childColumns = ["set_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["set_id"])],
)
data class ScanItemEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "set_id") val setId: String,
    val seq: Int,
    @ColumnInfo(name = "item_key") val itemKey: String,
    val value: String,
    val format: String,
    @ColumnInfo(name = "scanned_at") val scannedAt: String,
)
```

- [ ] **Step 3: ScanSetWithItems.kt を作成（@Relation）**

```kotlin
package com.example.myapp.db

import androidx.room.Embedded
import androidx.room.Relation

/**
 * セット + 所属 items の一括取得用。
 * 注意: @Relation は items の並び順を保証しないため、seq 順ソートは利用側（プラグイン）で行う。
 */
data class ScanSetWithItems(
    @Embedded val set: ScanSetEntity,
    @Relation(parentColumn = "id", entityColumn = "set_id")
    val items: List<ScanItemEntity>,
)
```

- [ ] **Step 4: コンパイル確認**

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
& .\android\gradlew.bat -p android :app:compileDebugKotlin
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```powershell
git add android/app/src/main/java/com/example/myapp/db
git commit -m "feat: Room Entity（scan_sets / scan_items）と Relation を定義"
```

---

### Task 3: DAO・AppDatabase と androidTest（TDD）

**Files:**
- Create: `android/app/src/androidTest/java/com/example/myapp/db/ScanRecordDaoTest.kt`（先に書く）
- Create: `android/app/src/main/java/com/example/myapp/db/ScanRecordDao.kt`
- Create: `android/app/src/main/java/com/example/myapp/db/FeatureCount.kt`
- Create: `android/app/src/main/java/com/example/myapp/db/AppDatabase.kt`

**Interfaces:**
- Consumes: Task 2 の Entity / Relation
- Produces: `AppDatabase.get(context).scanRecordDao()` と DAO の suspend 関数群 — Task 4 のプラグインが使用
  - `insertSet(set: ScanSetEntity)` / `insertItem(item: ScanItemEntity)`
  - `deleteSet(setId: String)` / `clearDrafts(featureId: String)`
  - `confirmCompletedDrafts(featureId: String, requiredCount: Int, confirmedAt: String): Int`
  - `findDraftSets(featureId: String): List<ScanSetWithItems>`
  - `countDrafts(): List<FeatureCount>`
  - `findLatestDraft(): ScanSetWithItems?`
  - `countItemsInSet(setId: String): Int`（CASCADE 検証用）

- [ ] **Step 1: 失敗するテストを先に書く（ScanRecordDaoTest.kt）**

```kotlin
package com.example.myapp.db

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ScanRecordDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var dao: ScanRecordDao

    @Before
    fun setUp() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java,
        ).build()
        dao = db.scanRecordDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    private fun set(
        id: String,
        featureId: String = "inbound",
        createdAt: String = "2026-07-08T10:00:00.000Z",
    ) = ScanSetEntity(id, featureId, "draft", createdAt, null)

    private fun item(
        id: String,
        setId: String,
        seq: Int,
        scannedAt: String = "2026-07-08T10:00:01.000Z",
    ) = ScanItemEntity(id, setId, seq, "part_no", "value-$id", "MOCK", scannedAt)

    @Test
    fun deleteSet_cascadesItems() = runBlocking {
        dao.insertSet(set("s1"))
        dao.insertItem(item("i1", "s1", 1))
        dao.insertItem(item("i2", "s1", 2))

        dao.deleteSet("s1")

        assertEquals(0, dao.findDraftSets("inbound").size)
        assertEquals(0, dao.countItemsInSet("s1")) // CASCADE で items も消える
    }

    @Test
    fun clearDrafts_deletesOnlyTargetFeatureDrafts() = runBlocking {
        dao.insertSet(set("s1", featureId = "inbound"))
        dao.insertItem(item("i1", "s1", 1))
        dao.insertSet(set("s2", featureId = "outbound"))

        dao.clearDrafts("inbound")

        assertEquals(0, dao.findDraftSets("inbound").size)
        assertEquals(1, dao.findDraftSets("outbound").size)
        assertEquals(0, dao.countItemsInSet("s1"))
    }

    @Test
    fun confirmCompletedDrafts_updatesOnlyCompletedSets() = runBlocking {
        // s1: 3 items → 確定される / s2: 1 item → draft のまま残る
        dao.insertSet(set("s1"))
        dao.insertItem(item("i1", "s1", 1))
        dao.insertItem(item("i2", "s1", 2))
        dao.insertItem(item("i3", "s1", 3))
        dao.insertSet(set("s2"))
        dao.insertItem(item("i4", "s2", 1))

        val n = dao.confirmCompletedDrafts("inbound", 3, "2026-07-08T11:00:00.000Z")

        assertEquals(1, n)
        assertEquals(listOf("s2"), dao.findDraftSets("inbound").map { it.set.id })
    }

    @Test
    fun findDraftSets_ordersByCreatedAt() = runBlocking {
        dao.insertSet(set("s2", createdAt = "2026-07-08T11:00:00.000Z"))
        dao.insertSet(set("s1", createdAt = "2026-07-08T10:00:00.000Z"))

        assertEquals(listOf("s1", "s2"), dao.findDraftSets("inbound").map { it.set.id })
    }

    @Test
    fun countDrafts_groupsByFeature() = runBlocking {
        dao.insertSet(set("s1", featureId = "inbound"))
        dao.insertSet(set("s2", featureId = "inbound"))
        dao.insertSet(set("s3", featureId = "outbound"))

        val counts = dao.countDrafts().associate { it.featureId to it.cnt }

        assertEquals(mapOf("inbound" to 2, "outbound" to 1), counts)
    }

    @Test
    fun findLatestDraft_prefersLatestScannedItemOverCreatedAt() = runBlocking {
        // s1 は古いが、より新しい item を持つ → s1 が最新
        dao.insertSet(set("s1", createdAt = "2026-07-08T10:00:00.000Z"))
        dao.insertItem(item("i1", "s1", 1, scannedAt = "2026-07-08T12:00:00.000Z"))
        dao.insertSet(set("s2", createdAt = "2026-07-08T11:00:00.000Z")) // items なし → created_at で比較

        assertEquals("s1", dao.findLatestDraft()?.set?.id)
    }

    @Test
    fun findLatestDraft_returnsNullWhenNoDrafts() = runBlocking {
        assertNull(dao.findLatestDraft())
    }
}
```

- [ ] **Step 2: コンパイルが失敗することを確認**

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
& .\android\gradlew.bat -p android :app:compileDebugAndroidTestKotlin
```

Expected: FAIL（`Unresolved reference: AppDatabase` / `ScanRecordDao`）

- [ ] **Step 3: FeatureCount.kt を作成**

```kotlin
package com.example.myapp.db

import androidx.room.ColumnInfo

/** countDrafts の GROUP BY 結果1行 */
data class FeatureCount(
    @ColumnInfo(name = "feature_id") val featureId: String,
    val cnt: Int,
)
```

- [ ] **Step 4: ScanRecordDao.kt を作成**

```kotlin
package com.example.myapp.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction

@Dao
interface ScanRecordDao {

    @Insert
    suspend fun insertSet(set: ScanSetEntity)

    @Insert
    suspend fun insertItem(item: ScanItemEntity)

    /** CASCADE により items も同一ステートメントで削除される（アトミック） */
    @Query("DELETE FROM scan_sets WHERE id = :setId")
    suspend fun deleteSet(setId: String)

    /** CASCADE により対象 draft の items もまとめて削除される（アトミック） */
    @Query("DELETE FROM scan_sets WHERE feature_id = :featureId AND status = 'draft'")
    suspend fun clearDrafts(featureId: String)

    @Query(
        """
        UPDATE scan_sets SET status = 'confirmed', confirmed_at = :confirmedAt
        WHERE feature_id = :featureId AND status = 'draft'
          AND id IN (SELECT set_id FROM scan_items GROUP BY set_id HAVING COUNT(*) >= :requiredCount)
        """
    )
    suspend fun confirmCompletedDrafts(featureId: String, requiredCount: Int, confirmedAt: String): Int

    @Transaction
    @Query("SELECT * FROM scan_sets WHERE feature_id = :featureId AND status = 'draft' ORDER BY created_at")
    suspend fun findDraftSets(featureId: String): List<ScanSetWithItems>

    @Query("SELECT feature_id, COUNT(*) AS cnt FROM scan_sets WHERE status = 'draft' GROUP BY feature_id")
    suspend fun countDrafts(): List<FeatureCount>

    @Transaction
    @Query(
        """
        SELECT * FROM scan_sets WHERE status = 'draft'
        ORDER BY COALESCE((SELECT MAX(scanned_at) FROM scan_items i WHERE i.set_id = scan_sets.id), created_at) DESC
        LIMIT 1
        """
    )
    suspend fun findLatestDraft(): ScanSetWithItems?

    /** テスト用: CASCADE 削除の検証 */
    @Query("SELECT COUNT(*) FROM scan_items WHERE set_id = :setId")
    suspend fun countItemsInSet(setId: String): Int
}
```

- [ ] **Step 5: AppDatabase.kt を作成**

```kotlin
package com.example.myapp.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [ScanSetEntity::class, ScanItemEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun scanRecordDao(): ScanRecordDao

    companion object {
        @Volatile
        private var instance: AppDatabase? = null

        fun get(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "quick_scan.db",
                ).build().also { instance = it }
            }
    }
}
```

- [ ] **Step 6: コンパイルが通ることを確認**

```powershell
& .\android\gradlew.bat -p android :app:compileDebugAndroidTestKotlin
```

Expected: `BUILD SUCCESSFUL`（KSP が DAO 実装と DB スキーマを生成。SQL の列名ミス等はここでコンパイルエラーになる = Room の静的検証）

- [ ] **Step 7: エミュレータを起動して androidTest を実行**

エミュレータが起動していない場合は Android Studio の Device Manager から起動しておく。

```powershell
& .\android\gradlew.bat -p android :app:connectedDebugAndroidTest
```

Expected: `BUILD SUCCESSFUL`、7 tests passed（レポート: `android/app/build/reports/androidTests/connected/`）

- [ ] **Step 8: Commit**

```powershell
git add android/app/src/main/java/com/example/myapp/db android/app/src/androidTest
git commit -m "feat: ScanRecordDao と AppDatabase を実装（androidTest 7件 green）"
```

---

### Task 4: ScanRecordPlugin と MainActivity 登録

**Files:**
- Create: `android/app/src/main/java/com/example/myapp/ScanRecordPlugin.kt`
- Modify: `android/app/src/main/java/com/example/myapp/MainActivity.java:9`（registerPlugin 追加）

**Interfaces:**
- Consumes: Task 3 の `AppDatabase.get(context).scanRecordDao()` と DAO suspend 関数
- Produces: Capacitor プラグイン `ScanRecord` の8メソッド。すべて camelCase JSON を resolve する
  - `createDraftSet({featureId})` → ScanSet / `addItem({setId,seq,itemKey,value,format})` → ScanItem
  - `deleteSet({setId})` / `clearDrafts({featureId})` → `{}`
  - `confirmCompletedDrafts({featureId,requiredCount})` → `{count}`
  - `findDraftSets({featureId})` → `{sets: [...]}`（items は seq 昇順）
  - `countDrafts()` → `{counts: {featureId: n}}`
  - `findLatestDraft()` → `{set: {...} | null}`

- [ ] **Step 1: ScanRecordPlugin.kt を作成**

```kotlin
package com.example.myapp

import com.example.myapp.db.AppDatabase
import com.example.myapp.db.ScanItemEntity
import com.example.myapp.db.ScanSetEntity
import com.example.myapp.db.ScanSetWithItems
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject

@CapacitorPlugin(name = "ScanRecord")
class ScanRecordPlugin : Plugin() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val dao by lazy { AppDatabase.get(context).scanRecordDao() }

    override fun handleOnDestroy() {
        scope.cancel()
    }

    /** DB 操作をコルーチンで実行し、例外は reject に変換する共通ラッパー */
    private fun PluginCall.launchDb(block: suspend () -> JSObject) {
        scope.launch {
            try {
                resolve(block())
            } catch (e: Exception) {
                reject(e.message ?: "DB エラー", e)
            }
        }
    }

    @PluginMethod
    fun createDraftSet(call: PluginCall) {
        val featureId = call.getString("featureId") ?: return call.reject("featureId は必須です")
        call.launchDb {
            val set = ScanSetEntity(
                id = UUID.randomUUID().toString(),
                featureId = featureId,
                status = "draft",
                createdAt = isoNow(),
                confirmedAt = null,
            )
            dao.insertSet(set)
            set.toJs()
        }
    }

    @PluginMethod
    fun addItem(call: PluginCall) {
        val setId = call.getString("setId") ?: return call.reject("setId は必須です")
        val seq = call.getInt("seq") ?: return call.reject("seq は必須です")
        val itemKey = call.getString("itemKey") ?: return call.reject("itemKey は必須です")
        val value = call.getString("value") ?: return call.reject("value は必須です")
        val format = call.getString("format") ?: return call.reject("format は必須です")
        call.launchDb {
            val item = ScanItemEntity(
                id = UUID.randomUUID().toString(),
                setId = setId,
                seq = seq,
                itemKey = itemKey,
                value = value,
                format = format,
                scannedAt = isoNow(),
            )
            dao.insertItem(item)
            item.toJs()
        }
    }

    @PluginMethod
    fun deleteSet(call: PluginCall) {
        val setId = call.getString("setId") ?: return call.reject("setId は必須です")
        call.launchDb {
            dao.deleteSet(setId)
            JSObject()
        }
    }

    @PluginMethod
    fun clearDrafts(call: PluginCall) {
        val featureId = call.getString("featureId") ?: return call.reject("featureId は必須です")
        call.launchDb {
            dao.clearDrafts(featureId)
            JSObject()
        }
    }

    @PluginMethod
    fun confirmCompletedDrafts(call: PluginCall) {
        val featureId = call.getString("featureId") ?: return call.reject("featureId は必須です")
        val requiredCount = call.getInt("requiredCount") ?: return call.reject("requiredCount は必須です")
        call.launchDb {
            val count = dao.confirmCompletedDrafts(featureId, requiredCount, isoNow())
            JSObject().apply { put("count", count) }
        }
    }

    @PluginMethod
    fun findDraftSets(call: PluginCall) {
        val featureId = call.getString("featureId") ?: return call.reject("featureId は必須です")
        call.launchDb {
            val sets = JSArray()
            dao.findDraftSets(featureId).forEach { sets.put(it.toJs()) }
            JSObject().apply { put("sets", sets) }
        }
    }

    @PluginMethod
    fun countDrafts(call: PluginCall) {
        call.launchDb {
            val counts = JSObject()
            dao.countDrafts().forEach { counts.put(it.featureId, it.cnt) }
            JSObject().apply { put("counts", counts) }
        }
    }

    @PluginMethod
    fun findLatestDraft(call: PluginCall) {
        call.launchDb {
            val latest = dao.findLatestDraft()
            JSObject().apply { put("set", latest?.toJs() ?: JSONObject.NULL) }
        }
    }

    /** JS の Date().toISOString() と同一形式（UTC・ミリ秒3桁） */
    private fun isoNow(): String {
        val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        fmt.timeZone = TimeZone.getTimeZone("UTC")
        return fmt.format(Date())
    }

    private fun ScanSetEntity.toJs(): JSObject = JSObject().apply {
        put("id", id)
        put("featureId", featureId)
        put("status", status)
        put("createdAt", createdAt)
        put("confirmedAt", confirmedAt ?: JSONObject.NULL)
    }

    private fun ScanItemEntity.toJs(): JSObject = JSObject().apply {
        put("id", id)
        put("setId", setId)
        put("seq", seq)
        put("itemKey", itemKey)
        put("value", value)
        put("format", format)
        put("scannedAt", scannedAt)
    }

    /** @Relation は並び順を保証しないため、ここで seq 昇順にソートする */
    private fun ScanSetWithItems.toJs(): JSObject = set.toJs().apply {
        val arr = JSArray()
        items.sortedBy { it.seq }.forEach { arr.put(it.toJs()) }
        put("items", arr)
    }
}
```

- [ ] **Step 2: MainActivity.java にプラグイン登録を追加**

```java
package com.example.myapp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SampleSdkPlugin.class); // アプリ内ローカルプラグインは自動登録されないため super より前に登録
        registerPlugin(ScanRecordPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

- [ ] **Step 3: ビルド確認**

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
& .\android\gradlew.bat -p android :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```powershell
git add android/app/src/main/java/com/example/myapp
git commit -m "feat: ScanRecord プラグインを実装（Room DAO を Capacitor ブリッジで公開）"
```

---

### Task 5: TS 側の差し替え（プラグイン定義 + repository 書き換え、TDD）

**Files:**
- Create: `src/plugins/scanRecord.ts`
- Modify: `src/db/scanRecordRepository.ts`（全面書き換え・シグネチャ維持）
- Test: `src/db/__tests__/scanRecordRepository.test.ts`(全面書き換え)

**Interfaces:**
- Consumes: Task 4 のプラグイン `ScanRecord`（8メソッド・camelCase JSON）
- Produces: 現行と同一のシグネチャ（画面・composable が使用中）:
  - `createDraftSet(featureId: string): Promise<ScanSet>`
  - `addItem(setId: string, input: {seq, itemKey, value, format}): Promise<ScanItem>`
  - `deleteSet(setId: string): Promise<void>` / `clearDrafts(featureId: string): Promise<void>`
  - `confirmCompletedDrafts(featureId: string, requiredCount: number): Promise<number>`
  - `findDraftSets(featureId: string): Promise<ScanSetWithItems[]>`
  - `countDrafts(): Promise<Record<string, number>>`
  - `findLatestDraft(): Promise<ScanSetWithItems | null>`

- [ ] **Step 1: src/plugins/scanRecord.ts を作成**

```ts
import { registerPlugin } from '@capacitor/core'
import type { ScanSet, ScanItem, ScanSetWithItems } from '@/types/quickScan'

export interface ScanRecordPlugin {
  createDraftSet(options: { featureId: string }): Promise<ScanSet>
  addItem(options: {
    setId: string
    seq: number
    itemKey: string
    value: string
    format: string
  }): Promise<ScanItem>
  deleteSet(options: { setId: string }): Promise<void>
  clearDrafts(options: { featureId: string }): Promise<void>
  confirmCompletedDrafts(options: {
    featureId: string
    requiredCount: number
  }): Promise<{ count: number }>
  findDraftSets(options: { featureId: string }): Promise<{ sets: ScanSetWithItems[] }>
  countDrafts(): Promise<{ counts: Record<string, number> }>
  findLatestDraft(): Promise<{ set: ScanSetWithItems | null }>
}

// ネイティブ実装のみ（ScanRecordPlugin.kt）。ブラウザでは repository 入口でエラーにする
export const ScanRecord = registerPlugin<ScanRecordPlugin>('ScanRecord')
```

- [ ] **Step 2: 失敗するテストを先に書く（scanRecordRepository.test.ts を全面書き換え）**

SQL 検証は DAO（androidTest）へ移ったため、ここでは「正しいメソッド・引数でプラグインを呼び、戻り値を正しく剥がすこと」と「Web ガード」を検証する。

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({ platform: 'android' }))

const plugin = vi.hoisted(() => ({
  createDraftSet: vi.fn(),
  addItem: vi.fn(),
  deleteSet: vi.fn(),
  clearDrafts: vi.fn(),
  confirmCompletedDrafts: vi.fn(),
  findDraftSets: vi.fn(),
  countDrafts: vi.fn(),
  findLatestDraft: vi.fn(),
}))

vi.mock('@/plugins/scanRecord', () => ({ ScanRecord: plugin }))
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => state.platform },
}))

import {
  createDraftSet,
  addItem,
  deleteSet,
  clearDrafts,
  confirmCompletedDrafts,
  findDraftSets,
  countDrafts,
  findLatestDraft,
} from '@/db/scanRecordRepository'

const scanSet = {
  id: 'set-1',
  featureId: 'inbound',
  status: 'draft' as const,
  createdAt: '2026-07-08T10:00:00.000Z',
  confirmedAt: null,
}
const scanItem = {
  id: 'item-1',
  setId: 'set-1',
  seq: 1,
  itemKey: 'part_no',
  value: '4901234567894',
  format: 'EAN_13',
  scannedAt: '2026-07-08T10:00:01.000Z',
}

describe('scanRecordRepository (ScanRecord プラグイン呼び出し)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.platform = 'android'
  })

  it('createDraftSet: featureId を渡しプラグインの戻り値をそのまま返す', async () => {
    plugin.createDraftSet.mockResolvedValue(scanSet)
    const set = await createDraftSet('inbound')
    expect(plugin.createDraftSet).toHaveBeenCalledWith({ featureId: 'inbound' })
    expect(set).toEqual(scanSet)
  })

  it('addItem: setId と入力値を1つのオプションにまとめて渡す', async () => {
    plugin.addItem.mockResolvedValue(scanItem)
    const item = await addItem('set-1', { seq: 1, itemKey: 'part_no', value: '4901234567894', format: 'EAN_13' })
    expect(plugin.addItem).toHaveBeenCalledWith({
      setId: 'set-1',
      seq: 1,
      itemKey: 'part_no',
      value: '4901234567894',
      format: 'EAN_13',
    })
    expect(item).toEqual(scanItem)
  })

  it('deleteSet / clearDrafts: 引数をそのまま渡す', async () => {
    plugin.deleteSet.mockResolvedValue(undefined)
    plugin.clearDrafts.mockResolvedValue(undefined)
    await deleteSet('set-1')
    await clearDrafts('inbound')
    expect(plugin.deleteSet).toHaveBeenCalledWith({ setId: 'set-1' })
    expect(plugin.clearDrafts).toHaveBeenCalledWith({ featureId: 'inbound' })
  })

  it('confirmCompletedDrafts: count を剥がして数値で返す', async () => {
    plugin.confirmCompletedDrafts.mockResolvedValue({ count: 2 })
    const n = await confirmCompletedDrafts('inbound', 3)
    expect(plugin.confirmCompletedDrafts).toHaveBeenCalledWith({ featureId: 'inbound', requiredCount: 3 })
    expect(n).toBe(2)
  })

  it('findDraftSets: sets を剥がして配列で返す', async () => {
    plugin.findDraftSets.mockResolvedValue({ sets: [{ ...scanSet, items: [scanItem] }] })
    const sets = await findDraftSets('inbound')
    expect(sets).toHaveLength(1)
    expect(sets[0].items[0].itemKey).toBe('part_no')
  })

  it('countDrafts: counts を剥がしてマップで返す', async () => {
    plugin.countDrafts.mockResolvedValue({ counts: { inbound: 3, outbound: 1 } })
    expect(await countDrafts()).toEqual({ inbound: 3, outbound: 1 })
  })

  it('findLatestDraft: set を剥がして返し、null はそのまま null', async () => {
    plugin.findLatestDraft.mockResolvedValue({ set: { ...scanSet, items: [] } })
    expect((await findLatestDraft())?.id).toBe('set-1')
    plugin.findLatestDraft.mockResolvedValue({ set: null })
    expect(await findLatestDraft()).toBeNull()
  })

  it('Web プラットフォームでは明示エラーを投げ、プラグインを呼ばない', async () => {
    state.platform = 'web'
    await expect(createDraftSet('inbound')).rejects.toThrow(
      'SQLite はブラウザでは利用できません。エミュレータまたは実機で確認してください'
    )
    expect(plugin.createDraftSet).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: テストが失敗することを確認**

```powershell
npx vitest run src/db/__tests__/scanRecordRepository.test.ts
```

Expected: FAIL（旧 repository は sqliteClient 経由のため、モックした ScanRecord プラグインは一度も呼ばれず検証が落ちる。モジュール読み込みエラーになる場合もあるが、いずれにせよ RED であることを確認）

- [ ] **Step 4: scanRecordRepository.ts を全面書き換え**

```ts
import { Capacitor } from '@capacitor/core'
import { ScanRecord } from '@/plugins/scanRecord'
import type { ScanSet, ScanItem, ScanSetWithItems } from '@/types/quickScan'

function assertNative(): void {
  if (Capacitor.getPlatform() === 'web') {
    throw new Error('SQLite はブラウザでは利用できません。エミュレータまたは実機で確認してください')
  }
}

export async function createDraftSet(featureId: string): Promise<ScanSet> {
  assertNative()
  return ScanRecord.createDraftSet({ featureId })
}

export async function addItem(
  setId: string,
  input: { seq: number; itemKey: string; value: string; format: string }
): Promise<ScanItem> {
  assertNative()
  return ScanRecord.addItem({ setId, ...input })
}

export async function deleteSet(setId: string): Promise<void> {
  assertNative()
  await ScanRecord.deleteSet({ setId })
}

export async function clearDrafts(featureId: string): Promise<void> {
  assertNative()
  await ScanRecord.clearDrafts({ featureId })
}

export async function confirmCompletedDrafts(featureId: string, requiredCount: number): Promise<number> {
  assertNative()
  const { count } = await ScanRecord.confirmCompletedDrafts({ featureId, requiredCount })
  return count
}

export async function findDraftSets(featureId: string): Promise<ScanSetWithItems[]> {
  assertNative()
  const { sets } = await ScanRecord.findDraftSets({ featureId })
  return sets
}

export async function countDrafts(): Promise<Record<string, number>> {
  assertNative()
  const { counts } = await ScanRecord.countDrafts()
  return counts
}

export async function findLatestDraft(): Promise<ScanSetWithItems | null> {
  assertNative()
  const { set } = await ScanRecord.findLatestDraft()
  return set ?? null
}
```

- [ ] **Step 5: テストが通ることを確認**

```powershell
npx vitest run src/db/__tests__/scanRecordRepository.test.ts
```

Expected: PASS（8 tests）

- [ ] **Step 6: 型チェックと全テスト**

```powershell
npm run type-check
npx vitest run
```

Expected: 両方 green（`sqliteClient.ts` はまだ存在するので型エラーなし）

- [ ] **Step 7: Commit**

```powershell
git add src/plugins/scanRecord.ts src/db/scanRecordRepository.ts src/db/__tests__/scanRecordRepository.test.ts
git commit -m "feat: scanRecordRepository を ScanRecord プラグイン呼び出しに差し替え"
```

---

### Task 6: 旧実装の撤去（sqliteClient / @capacitor-community/sqlite）

**Files:**
- Delete: `src/db/sqliteClient.ts`
- Delete: `src/db/types.ts`
- Modify: `package.json` / `package-lock.json`（`@capacitor-community/sqlite` 削除）
- Modify: `android/capacitor.settings.gradle` / `android/app/capacitor.build.gradle`（`npx cap sync` による自動再生成）

**Interfaces:**
- Consumes: Task 5 完了（repository が sqliteClient を import しなくなっていること）
- Produces: なし（削除のみ）

- [ ] **Step 1: 参照が残っていないことを確認**

Grep ツールで `sqliteClient|DbExecutor|@capacitor-community/sqlite` を `src/` に対して検索する。

Expected: ヒットは `src/db/sqliteClient.ts` と `src/db/types.ts` 自身のみ

- [ ] **Step 2: ファイル削除と依存削除**

```powershell
Remove-Item src/db/sqliteClient.ts, src/db/types.ts -Confirm:$false
npm uninstall @capacitor-community/sqlite
```

- [ ] **Step 3: Capacitor 設定を再生成**

```powershell
npx cap sync android
```

Expected: `capacitor.settings.gradle` / `capacitor.build.gradle` から `capacitor-community-sqlite` の行が消える

- [ ] **Step 4: 全検証（TS + Android）**

```powershell
npm run type-check
npx vitest run
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
& .\android\gradlew.bat -p android :app:assembleDebug
```

Expected: すべて green / `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "refactor: 旧 SQLite 実装（sqliteClient / @capacitor-community/sqlite）を撤去"
```

---

### Task 7: ドキュメント改訂

**Files:**
- Modify: `docs/guides/sqlite-guide.md`（Room 構成に全面改訂）

**Interfaces:**
- Consumes: Task 1〜6 の最終構成
- Produces: なし（ドキュメントのみ）

- [ ] **Step 1: sqlite-guide.md を全面改訂**

以下の構成で書き直す（§2 テーブル定義・§4 中身を見る方法・§5 リセット方法・close-on-back の教訓は現行の内容をほぼ流用できる）:

```markdown
# SQLite 操作ガイド（クイックスキャンのローカルDB・Room 版）

**対象**: Kotlin + Room によるオフラインデータ保持の仕組み・操作方法・中身の確認方法
**関連実装**: `src/db/` `src/plugins/scanRecord.ts` `android/app/src/main/java/com/example/myapp/db/`
**設計書**: `docs/superpowers/specs/2026-07-08-room-migration-design.md`

## 1. 全体像
画面 → scanRecordRepository.ts（薄いラッパー）→ ScanRecord プラグイン（Capacitor ブリッジ）
→ ScanRecordDao（Room・SQL はここ）→ /data/data/com.example.myapp/databases/quick_scan.db
- ブラウザでは動かない（repository 入口で明示エラー）。動作確認はエミュレータ/実機
- SQL・スキーマ・ID/日時の生成はすべてネイティブ側の責務

## 2. テーブル定義
（現行ガイドの §2 を流用。追加: 外部キー set_id→scan_sets.id ON DELETE CASCADE、
 index: scan_sets(feature_id,status) / scan_items(set_id)）

## 3. コードからの操作方法
- 画面からは従来どおり scanRecordRepository の8関数（シグネチャ不変）
- 新しい操作を足すとき: ScanRecordDao に @Query → ScanRecordPlugin にメソッド
  → scanRecord.ts の型 → scanRecordRepository に関数、の4点セット
- DAO の SQL は KSP がコンパイル時に検証する（列名ミスはビルドエラー）

## 4. 中身を見る方法
（現行 §4 を流用: Database Inspector / adb 吸い出し。DB ファイル名を quick_scan.db に置換）

## 5. データのリセット
（現行 §5 を流用）

## 6. ハマりどころ
- ローカルプラグインは MainActivity での registerPlugin が必須（忘れると "not implemented" エラー）
- @Relation は items の並び順を保証しない → プラグイン側で seq ソートしている
- スキーマ変更時は @Database の version を上げて Migration を書く（version 据え置きだと
  「Room cannot verify the data integrity」でクラッシュ。開発中はアプリのデータ消去でも回避可）
- DAO テストは `gradlew -p android :app:connectedDebugAndroidTest`（エミュレータ必須）
- （現行の close-on-back の教訓は残す）
```

- [ ] **Step 2: Commit**

```powershell
git add docs/guides/sqlite-guide.md
git commit -m "docs: SQLite 操作ガイドを Room 構成に全面改訂"
```

---

### Task 8: エミュレータでの受け入れ確認

**Files:** なし（検証のみ。問題があれば該当タスクに戻って修正）

**Interfaces:**
- Consumes: Task 1〜7 のすべて

- [ ] **Step 1: Web 資産をビルドして同期し、エミュレータで起動**

```powershell
npm run build
npx cap sync android
npx cap run android
```

（`cap run` が対話プロンプトを出す場合は Android Studio から Run でもよい）

- [ ] **Step 2: 機能フローの確認**

1. 機能選択 → 読み取り画面 → モックスキャンで 1〜3 項目読み取り → draft が一覧に出る
2. 確定ボタン → 完成セットのみ確定され、未完成セットは draft のまま残る
3. アプリをタスクキルして再起動 → draft が残っている（永続化の確認)
4. クリア操作 → draft のみ消える

- [ ] **Step 3: Database Inspector で確認**

Android Studio → App Inspection → Database Inspector で `quick_scan.db` に
`scan_sets` / `scan_items` テーブルがあり、上記操作の結果が反映されていること。

- [ ] **Step 4: 最終チェックの一括実行**

```powershell
npm run type-check
npx vitest run
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
& .\android\gradlew.bat -p android :app:connectedDebugAndroidTest
```

Expected: すべて green

- [ ] **Step 5: プッシュ**

```powershell
git push
```
