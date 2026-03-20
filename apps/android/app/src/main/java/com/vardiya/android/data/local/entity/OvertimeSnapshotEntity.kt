package com.vardiya.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "overtime_snapshots")
data class OvertimeSnapshotEntity(
    @PrimaryKey val id: String,
    val weekStartIso: String,
    val strategy: String,
    val totalMinutes: Int,
    val regularMinutes: Int,
    val overtimeMinutes: Int,
    val estimatedPay: Double,
    val currencyCode: String,
    val createdAtMillis: Long
)
