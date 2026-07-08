package com.example.myapp.db

import androidx.room.ColumnInfo

/** countDrafts の GROUP BY 結果1行 */
data class FeatureCount(
    @ColumnInfo(name = "feature_id") val featureId: String,
    val cnt: Int,
)
