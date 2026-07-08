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
