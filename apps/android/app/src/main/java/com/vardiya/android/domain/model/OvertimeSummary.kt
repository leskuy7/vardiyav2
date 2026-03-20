package com.vardiya.android.domain.model

data class OvertimeSummary(
    val strategy: OvertimeStrategy,
    val totalMinutes: Int,
    val regularMinutes: Int,
    val overtimeMinutes: Int,
    val estimatedPay: Double,
    val currencyCode: String
)
