package com.vardiya.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "reminders")
data class ReminderEntity(
    @PrimaryKey val shiftId: Long,
    val remindAtMillis: Long,
    val leadMinutes: Int,
    val enabled: Boolean
)
