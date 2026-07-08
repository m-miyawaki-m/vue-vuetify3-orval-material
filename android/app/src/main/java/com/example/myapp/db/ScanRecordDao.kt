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
