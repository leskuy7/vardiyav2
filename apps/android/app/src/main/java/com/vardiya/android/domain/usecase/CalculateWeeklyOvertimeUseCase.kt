package com.vardiya.android.domain.usecase

import com.vardiya.android.domain.model.OvertimeStrategy
import com.vardiya.android.domain.model.OvertimeSummary
import com.vardiya.android.domain.model.PayProfile
import com.vardiya.android.domain.model.ShiftRecord
import com.vardiya.android.domain.model.TimeEntryRecord
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class CalculateWeeklyOvertimeUseCase(
    private val zoneId: ZoneId = ZoneId.of("Europe/Istanbul")
) {
    operator fun invoke(
        weekStart: LocalDate,
        strategy: OvertimeStrategy,
        shifts: List<ShiftRecord>,
        timeEntries: List<TimeEntryRecord>,
        payProfile: PayProfile
    ): OvertimeSummary {
        val rangeStart = weekStart.atStartOfDay(zoneId).toInstant()
        val rangeEnd = weekStart.plusDays(7).atStartOfDay(zoneId).toInstant()

        val totalMinutes = when (strategy) {
            OvertimeStrategy.PLANNED -> shifts.sumOf { durationWithinRange(it.startAtMillis, it.endAtMillis, rangeStart, rangeEnd) }
            OvertimeStrategy.ACTUAL -> timeEntries.sumOf {
                val checkOutAtMillis = it.checkOutAtMillis ?: return@sumOf 0
                durationWithinRange(it.checkInAtMillis, checkOutAtMillis, rangeStart, rangeEnd)
            }
        }

        val maxWeeklyMinutes = payProfile.maxWeeklyHours * 60
        val regularMinutes = minOf(totalMinutes, maxWeeklyMinutes)
        val overtimeMinutes = (totalMinutes - maxWeeklyMinutes).coerceAtLeast(0)
        val ratePerMinute = payProfile.hourlyRate / 60.0
        val estimatedPay = (regularMinutes * ratePerMinute) + (overtimeMinutes * ratePerMinute * payProfile.overtimeMultiplier)

        return OvertimeSummary(
            strategy = strategy,
            totalMinutes = totalMinutes,
            regularMinutes = regularMinutes,
            overtimeMinutes = overtimeMinutes,
            estimatedPay = estimatedPay,
            currencyCode = payProfile.currencyCode
        )
    }

    private fun durationWithinRange(
        startAtMillis: Long,
        endAtMillis: Long,
        rangeStart: Instant,
        rangeEnd: Instant
    ): Int {
        val itemStart = Instant.ofEpochMilli(startAtMillis)
        val itemEnd = Instant.ofEpochMilli(endAtMillis)
        val effectiveStart = maxOf(itemStart, rangeStart)
        val effectiveEnd = minOf(itemEnd, rangeEnd)

        if (effectiveEnd <= effectiveStart) {
            return 0
        }

        return ((effectiveEnd.toEpochMilli() - effectiveStart.toEpochMilli()) / 60_000L).toInt()
    }
}
