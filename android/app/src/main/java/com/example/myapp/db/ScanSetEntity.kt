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
