# Room/SQLite 除去 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Room/SQLite を撤去し、クイックスキャンの保存層をメモリ実装に置き換える（画面・フローは維持）。

**Architecture:** `src/db/scanRecordRepository.ts` の公開 API（8 関数）を維持したまま中身をモジュール内 `Map` に差し替え、ScanRecord Capacitor プラグインと Android 側の Kotlin/Room 一式（Kotlin/KSP ツールチェーン含む）を削除する。呼び出し側（QuickScanMenuPage / QuickScanWorkPage / ResumeWorkButton）は変更しない。

**Tech Stack:** Vue 3 + TypeScript + Vitest / Capacitor 7 / Android Gradle

**Spec:** `docs/superpowers/specs/2026-07-12-remove-room-sqlite-design.md`

## Global Constraints

- `scanRecordRepository.ts` の公開関数名・シグネチャは変更しない（呼び出し側を触らないため）
- Android の gradle CLI 実行時は先に `$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'` を設定する（デフォルトの JDK 17 では失敗する）
- コミットメッセージは既存の慣例に合わせ日本語（`feat:` / `refactor:` / `docs:` プレフィックス）

---

### Task 1: scanRecordRepository をメモリ実装に書き換え、ScanRecord プラグインブリッジを削除

**Files:**
- Modify: `src/db/scanRecordRepository.ts`（全面書き換え）
- Modify: `src/db/__tests__/scanRecordRepository.test.ts`（全面書き換え）
- Delete: `src/plugins/scanRecord.ts`

**Interfaces:**
- Consumes: `ScanSet` / `ScanItem` / `ScanSetWithItems`（`src/types/quickScan.ts`、変更なし）
- Produces: 既存と同一の 8 関数 `createDraftSet` / `addItem` / `deleteSet` / `clearDrafts` / `confirmCompletedDrafts` / `findDraftSets` / `countDrafts` / `findLatestDraft`、＋テスト用 `__resetForTest(): void`

- [ ] **Step 1: テストをメモリ実装の実挙動を検証する形に全面書き換え（失敗するテスト）**

`src/db/__tests__/scanRecordRepository.test.ts` を以下の内容に置き換える:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDraftSet,
  addItem,
  deleteSet,
  clearDrafts,
  confirmCompletedDrafts,
  findDraftSets,
  countDrafts,
  findLatestDraft,
  __resetForTest,
} from '@/db/scanRecordRepository'

describe('scanRecordRepository (メモリ実装)', () => {
  beforeEach(() => {
    __resetForTest()
  })

  it('createDraftSet: draft ステータスのセットを新規作成する', async () => {
    const set = await createDraftSet('inbound')
    expect(set.id).toBeTruthy()
    expect(set.featureId).toBe('inbound')
    expect(set.status).toBe('draft')
    expect(set.confirmedAt).toBeNull()
    expect(new Date(set.createdAt).getTime()).not.toBeNaN()
  })

  it('addItem: セットにアイテムを追加し findDraftSets で参照できる', async () => {
    const set = await createDraftSet('inbound')
    const item = await addItem(set.id, {
      seq: 1,
      itemKey: 'part_no',
      value: '4901234567894',
      format: 'EAN_13',
    })
    expect(item.setId).toBe(set.id)
    expect(item.seq).toBe(1)
    expect(new Date(item.scannedAt).getTime()).not.toBeNaN()

    const sets = await findDraftSets('inbound')
    expect(sets).toHaveLength(1)
    expect(sets[0].items).toHaveLength(1)
    expect(sets[0].items[0].value).toBe('4901234567894')
  })

  it('addItem: 存在しない setId はエラー', async () => {
    await expect(
      addItem('missing', { seq: 1, itemKey: 'k', value: 'v', format: 'MOCK' })
    ).rejects.toThrow('セットが見つかりません')
  })

  it('deleteSet: 指定セットのみ削除する', async () => {
    const a = await createDraftSet('inbound')
    const b = await createDraftSet('inbound')
    await deleteSet(a.id)
    const sets = await findDraftSets('inbound')
    expect(sets.map((s) => s.id)).toEqual([b.id])
  })

  it('clearDrafts: 対象 featureId の draft のみ全削除する', async () => {
    await createDraftSet('inbound')
    await createDraftSet('inbound')
    await createDraftSet('outbound')
    await clearDrafts('inbound')
    expect(await findDraftSets('inbound')).toHaveLength(0)
    expect(await findDraftSets('outbound')).toHaveLength(1)
  })

  it('confirmCompletedDrafts: requiredCount に達した draft を confirmed にして件数を返す', async () => {
    const done = await createDraftSet('inbound')
    await addItem(done.id, { seq: 1, itemKey: 'a', value: '1', format: 'MOCK' })
    await addItem(done.id, { seq: 2, itemKey: 'b', value: '2', format: 'MOCK' })
    const incomplete = await createDraftSet('inbound')
    await addItem(incomplete.id, { seq: 1, itemKey: 'a', value: '1', format: 'MOCK' })

    const count = await confirmCompletedDrafts('inbound', 2)
    expect(count).toBe(1)
    // confirmed になったセットは draft 一覧から消える
    const drafts = await findDraftSets('inbound')
    expect(drafts.map((s) => s.id)).toEqual([incomplete.id])
  })

  it('findDraftSets: 他 featureId や confirmed を含まず、作成順で返す', async () => {
    const first = await createDraftSet('inbound')
    const second = await createDraftSet('inbound')
    await createDraftSet('outbound')
    const sets = await findDraftSets('inbound')
    expect(sets.map((s) => s.id)).toEqual([first.id, second.id])
  })

  it('countDrafts: featureId ごとの draft 件数を返す（confirmed は数えない）', async () => {
    await createDraftSet('inbound')
    await createDraftSet('inbound')
    const done = await createDraftSet('outbound')
    await addItem(done.id, { seq: 1, itemKey: 'a', value: '1', format: 'MOCK' })
    await confirmCompletedDrafts('outbound', 1)
    expect(await countDrafts()).toEqual({ inbound: 2 })
  })

  it('findLatestDraft: 最後に作成された draft を返し、なければ null', async () => {
    expect(await findLatestDraft()).toBeNull()
    await createDraftSet('inbound')
    const latest = await createDraftSet('outbound')
    expect((await findLatestDraft())?.id).toBe(latest.id)
  })

  it('読み取り結果を変更しても内部状態に影響しない（コピーを返す）', async () => {
    const set = await createDraftSet('inbound')
    await addItem(set.id, { seq: 1, itemKey: 'a', value: '1', format: 'MOCK' })
    const sets = await findDraftSets('inbound')
    sets[0].items.pop()
    expect((await findDraftSets('inbound'))[0].items).toHaveLength(1)
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npx vitest run src/db/__tests__/scanRecordRepository.test.ts`
Expected: FAIL（`__resetForTest` が存在しない / 旧実装がプラグインを呼ぼうとする）

- [ ] **Step 3: scanRecordRepository.ts をメモリ実装に書き換え**

`src/db/scanRecordRepository.ts` を以下の内容に置き換える:

```typescript
import type { ScanSet, ScanItem, ScanSetWithItems } from '@/types/quickScan'

// Room/SQLite 撤去に伴う保存層のメモリ実装。アプリ再起動で下書きは消える
const sets = new Map<string, ScanSetWithItems>()

/** テスト専用: 保持中のセットを全消去する */
export function __resetForTest(): void {
  sets.clear()
}

export async function createDraftSet(featureId: string): Promise<ScanSet> {
  const set: ScanSetWithItems = {
    id: crypto.randomUUID(),
    featureId,
    status: 'draft',
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    items: [],
  }
  sets.set(set.id, set)
  return structuredClone(set)
}

export async function addItem(
  setId: string,
  input: { seq: number; itemKey: string; value: string; format: string }
): Promise<ScanItem> {
  const set = sets.get(setId)
  if (!set) {
    throw new Error(`セットが見つかりません: ${setId}`)
  }
  const item: ScanItem = {
    id: crypto.randomUUID(),
    setId,
    ...input,
    scannedAt: new Date().toISOString(),
  }
  set.items.push(item)
  return structuredClone(item)
}

export async function deleteSet(setId: string): Promise<void> {
  sets.delete(setId)
}

export async function clearDrafts(featureId: string): Promise<void> {
  for (const [id, set] of sets) {
    if (set.featureId === featureId && set.status === 'draft') {
      sets.delete(id)
    }
  }
}

export async function confirmCompletedDrafts(
  featureId: string,
  requiredCount: number
): Promise<number> {
  let count = 0
  for (const set of sets.values()) {
    if (set.featureId === featureId && set.status === 'draft' && set.items.length >= requiredCount) {
      set.status = 'confirmed'
      set.confirmedAt = new Date().toISOString()
      count++
    }
  }
  return count
}

export async function findDraftSets(featureId: string): Promise<ScanSetWithItems[]> {
  return [...sets.values()]
    .filter((set) => set.featureId === featureId && set.status === 'draft')
    .map((set) => structuredClone(set))
}

export async function countDrafts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const set of sets.values()) {
    if (set.status === 'draft') {
      counts[set.featureId] = (counts[set.featureId] ?? 0) + 1
    }
  }
  return counts
}

export async function findLatestDraft(): Promise<ScanSetWithItems | null> {
  let latest: ScanSetWithItems | null = null
  // Map は挿入順を保持するため、最後に見つかった draft が最新
  for (const set of sets.values()) {
    if (set.status === 'draft') {
      latest = set
    }
  }
  return latest ? structuredClone(latest) : null
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npx vitest run src/db/__tests__/scanRecordRepository.test.ts`
Expected: PASS（10 件）

- [ ] **Step 5: プラグインブリッジを削除し、全テスト＋型チェックを実行**

```powershell
Remove-Item src/plugins/scanRecord.ts
npm run test:run
npm run type-check
```

Expected: `src/plugins/scanRecord.ts` への参照は書き換え済みの repository のみだったため、全テスト PASS・型エラーなし。
（QuickScanMenuPage / QuickScanWorkPage / ResumeWorkButton の各テストは repository をモックしているため影響なし）

- [ ] **Step 6: コミット**

```powershell
git add src/db/scanRecordRepository.ts src/db/__tests__/scanRecordRepository.test.ts src/plugins/scanRecord.ts
git commit -m "refactor: scanRecordRepository をメモリ実装に置換（ScanRecord プラグイン呼び出しを撤去）"
```

---

### Task 2: Android 側の Kotlin/Room 一式をロールバック

**Files:**
- Delete: `android/app/src/main/java/com/example/myapp/db/`（6 ファイル: `AppDatabase.kt` / `ScanRecordDao.kt` / `ScanSetEntity.kt` / `ScanItemEntity.kt` / `ScanSetWithItems.kt` / `FeatureCount.kt`）
- Delete: `android/app/src/main/java/com/example/myapp/ScanRecordPlugin.kt`
- Delete: `android/app/src/androidTest/java/com/example/myapp/db/ScanRecordDaoTest.kt`
- Modify: `android/app/src/main/java/com/example/myapp/MainActivity.java:10`
- Modify: `android/app/build.gradle`（plugin 2 行・依存 4 行・`kotlinOptions` ブロック）
- Modify: `android/build.gradle:12-13`
- Modify: `android/variables.gradle:16-17`

**Interfaces:**
- Consumes: なし（Task 1 完了後、フロントは ScanRecord プラグインを参照していない）
- Produces: なし（削除のみ。`SampleSdkPlugin` の登録は維持する）

- [ ] **Step 1: Kotlin ファイルと androidTest を削除**

```powershell
Remove-Item -Recurse -Force android/app/src/main/java/com/example/myapp/db
Remove-Item android/app/src/main/java/com/example/myapp/ScanRecordPlugin.kt
Remove-Item -Recurse -Force android/app/src/androidTest/java/com/example/myapp/db
```

- [ ] **Step 2: MainActivity からプラグイン登録を削除**

`android/app/src/main/java/com/example/myapp/MainActivity.java` から次の 1 行を削除する（`SampleSdkPlugin` の登録は残す）:

```java
        registerPlugin(ScanRecordPlugin.class);
```

- [ ] **Step 3: app/build.gradle から Kotlin/KSP/Room を削除**

`android/app/build.gradle` から以下を削除する:

```groovy
apply plugin: 'org.jetbrains.kotlin.android'
apply plugin: 'com.google.devtools.ksp'
```

```groovy
    kotlinOptions {
        jvmTarget = '21'
    }
```

```groovy
    implementation "androidx.room:room-runtime:$roomVersion"
    implementation "androidx.room:room-ktx:$roomVersion"
    ksp "androidx.room:room-compiler:$roomVersion"
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:$coroutinesVersion"
```

- [ ] **Step 4: ルート build.gradle と variables.gradle から Kotlin/KSP/Room のバージョン定義を削除**

`android/build.gradle` の buildscript dependencies から以下を削除する:

```groovy
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.0.21'
        classpath 'com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:2.0.21-1.0.28'
```

`android/variables.gradle` から以下を削除する:

```groovy
    roomVersion = '2.6.1'
    coroutinesVersion = '1.9.0'
```

- [ ] **Step 5: Android ビルドで検証**

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
& .\android\gradlew.bat -p android :app:assembleDebug
```

Expected: BUILD SUCCESSFUL（Kotlin/KSP プラグインなしでコンパイルが通る）

- [ ] **Step 6: コミット**

```powershell
git add android
git commit -m "refactor: Android の Room/Kotlin 構成を撤去（ScanRecordPlugin・db パッケージ・KSP ツールチェーン）"
```

---

### Task 3: ドキュメント整理と残存参照の確認

**Files:**
- Delete: `docs/guides/sqlite-guide.md`
- Modify: `docs/guides/capacitor8-offline-upgrade.md`（冒頭に Room 撤去済みの注記を追加）

**Interfaces:**
- Consumes: なし
- Produces: なし

- [ ] **Step 1: sqlite-guide.md を削除**

```powershell
Remove-Item docs/guides/sqlite-guide.md
```

- [ ] **Step 2: capacitor8-offline-upgrade.md に Room 撤去済みの注記を追加**

`docs/guides/capacitor8-offline-upgrade.md` は Room 前提の記述が 8 箇所ある（バージョン表・Nexus 設定・動作確認手順・トラブルシューティング等）。個別に消すと文書の整合が崩れるため、本文は履歴として残し、タイトル直後に以下の注記を 1 ブロック追加する:

```markdown
> **注記（2026-07-12）**: Room/SQLite はプロジェクトから撤去済み（`docs/superpowers/specs/2026-07-12-remove-room-sqlite-design.md`）。本書の Room・Kotlin・KSP に関する手順（バージョン更新・Nexus proxy・データ残存確認・トラブルシューティング）は実施不要。`docs/guides/sqlite-guide.md` も削除済み。
```

- [ ] **Step 3: 残存参照を確認**

```powershell
git grep -i -E 'room|sqlite' -- ':!docs/superpowers' ':!package-lock.json'
```

Expected: ヒットするのは `docs/guides/capacitor8-package-versions.md` と `docs/guides/capacitor8-offline-upgrade.md`（いずれも Capacitor 8 移行検討の履歴記録、注記付きで残置）のみ。`src/` と `android/` にヒットがないこと。
※ `ScanRecord` の語は `scanRecordRepository.ts` のファイル名・API 名として意図的に残る（spec 参照）

- [ ] **Step 4: コミット**

```powershell
git add docs/guides
git commit -m "docs: SQLite 操作ガイドを削除し、Capacitor 8 手順書に Room 撤去済みの注記を追加"
```
