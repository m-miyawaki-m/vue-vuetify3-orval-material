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
