package com.vardiya.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "shifts")
data class ShiftEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val note: String?,
    val startAtMillis: Long,
    val endAtMillis: Long,
    val createdAtMillis: Long,
    val updatedAtMillis: Long
)
