package com.vardiya.android.domain.model

data class PayProfile(
    val hourlyRate: Double,
    val maxWeeklyHours: Int,
    val overtimeMultiplier: Double,
    val currencyCode: String
) {
    companion object {
        val Default = PayProfile(
            hourlyRate = 0.0,
            maxWeeklyHours = 45,
            overtimeMultiplier = 1.5,
            currencyCode = "TRY"
        )
    }
}
