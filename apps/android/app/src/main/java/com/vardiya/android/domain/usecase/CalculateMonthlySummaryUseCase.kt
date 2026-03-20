package com.vardiya.android.domain.usecase

import com.vardiya.android.domain.model.MonthlySummary
import com.vardiya.android.domain.model.OvertimeStrategy
import com.vardiya.android.domain.model.PayProfile
import com.vardiya.android.domain.model.ShiftRecord
import com.vardiya.android.domain.model.TimeEntryRecord
import java.time.LocalDate
import java.time.YearMonth

class CalculateMonthlySummaryUseCase(
    private val weeklyOvertime: CalculateWeeklyOvertimeUseCase = CalculateWeeklyOvertimeUseCase()
) {
    operator fun invoke(
        month: YearMonth,
        strategy: OvertimeStrategy,
        shifts: List<ShiftRecord>,
        timeEntries: List<TimeEntryRecord>,
        payProfile: PayProfile
    ): MonthlySummary {
        val monthStart = month.atDay(1)
        val monthEnd = month.plusMonths(1).atDay(1)
        var cursor: LocalDate = monthStart
        var totalMinutes = 0
        var overtimeMinutes = 0
        var estimatedPay = 0.0

        while (cursor < monthEnd) {
            val weekly = weeklyOvertime(
                weekStart = cursor,
                strategy = strategy,
                shifts = shifts,
                timeEntries = timeEntries,
                payProfile = payProfile
            )
            totalMinutes += weekly.totalMinutes
            overtimeMinutes += weekly.overtimeMinutes
            estimatedPay += weekly.estimatedPay
            cursor = cursor.plusDays(7)
        }

        return MonthlySummary(
            totalMinutes = totalMinutes,
            overtimeMinutes = overtimeMinutes,
            estimatedPay = estimatedPay,
            currencyCode = payProfile.currencyCode
        )
    }
}
