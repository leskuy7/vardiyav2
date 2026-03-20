package com.vardiya.android.domain.model

data class ShiftRecord(
    val id: Long,
    val title: String,
    val note: String?,
    val startAtMillis: Long,
    val endAtMillis: Long
)
