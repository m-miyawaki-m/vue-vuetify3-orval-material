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
