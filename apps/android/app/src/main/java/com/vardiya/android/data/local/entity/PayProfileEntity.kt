package com.vardiya.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pay_profile")
data class PayProfileEntity(
    @PrimaryKey val id: Int = 1,
    val hourlyRate: Double,
    val maxWeeklyHours: Int,
    val overtimeMultiplier: Double,
    val currencyCode: String
)
