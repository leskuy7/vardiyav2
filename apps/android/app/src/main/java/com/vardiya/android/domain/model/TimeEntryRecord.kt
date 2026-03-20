package com.vardiya.android.domain.model

data class TimeEntryRecord(
    val id: Long,
    val shiftId: Long?,
    val checkInAtMillis: Long,
    val checkOutAtMillis: Long?,
    val status: String,
    val source: String
)
