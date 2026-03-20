package com.vardiya.android.domain.model

data class MonthlySummary(
    val totalMinutes: Int,
    val overtimeMinutes: Int,
    val estimatedPay: Double,
    val currencyCode: String
)
