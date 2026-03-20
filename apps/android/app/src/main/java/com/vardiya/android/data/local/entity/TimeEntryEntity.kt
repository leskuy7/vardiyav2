package com.vardiya.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "time_entries")
data class TimeEntryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val shiftId: Long?,
    val checkInAtMillis: Long,
    val checkOutAtMillis: Long?,
    val status: String,
    val source: String,
    val createdAtMillis: Long
)
