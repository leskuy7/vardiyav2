package com.vardiya.android.domain.usecase

import com.vardiya.android.domain.model.OvertimeStrategy
import com.vardiya.android.domain.model.PayProfile
import com.vardiya.android.domain.model.ShiftRecord
import com.vardiya.android.domain.model.TimeEntryRecord
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

class CalculateWeeklyOvertimeUseCaseTest {
    private val zoneId = ZoneId.of("Europe/Istanbul")
    private val useCase = CalculateWeeklyOvertimeUseCase(zoneId)
    private val profile = PayProfile(hourlyRate = 120.0, maxWeeklyHours = 45, overtimeMultiplier = 1.5, currencyCode = "TRY")

    @Test
    fun `planned strategy under weekly limit`() {
        val weekStart = LocalDate.of(2026, 3, 16)
        val shifts = listOf(
            shift(1, weekStart, 0, 9, 18),
            shift(2, weekStart, 1, 9, 18),
            shift(3, weekStart, 2, 9, 18),
            shift(4, weekStart, 3, 9, 18)
        )

        val result = useCase(weekStart, OvertimeStrategy.PLANNED, shifts, emptyList(), profile)

        assertEquals(2_160, result.totalMinutes)
        assertEquals(0, result.overtimeMinutes)
    }

    @Test
    fun `planned strategy calculates overtime over 45 hours`() {
        val weekStart = LocalDate.of(2026, 3, 16)
        val shifts = (0..5).map { day -> shift(day.toLong(), weekStart, day, 8, 18) }

        val result = useCase(weekStart, OvertimeStrategy.PLANNED, shifts, emptyList(), profile)

        assertEquals(3_600, result.totalMinutes)
        assertEquals(900, result.overtimeMinutes)
    }

    @Test
    fun `night shift crossing midnight remains in the correct week overlap`() {
        val weekStart = LocalDate.of(2026, 3, 16)
        val shifts = listOf(shift(1, weekStart.minusDays(1), 0, 23, 7))

        val result = useCase(weekStart, OvertimeStrategy.PLANNED, shifts, emptyList(), profile)

        assertEquals(420, result.totalMinutes)
    }

    @Test
    fun `actual strategy ignores open entries`() {
        val weekStart = LocalDate.of(2026, 3, 16)
        val entries = listOf(
            TimeEntryRecord(
                id = 1,
                shiftId = null,
                checkInAtMillis = epoch(weekStart, 0, 9, 0),
                checkOutAtMillis = epoch(weekStart, 0, 18, 0),
                status = "CLOSED",
                source = "MOBILE"
            ),
            TimeEntryRecord(
                id = 2,
                shiftId = null,
                checkInAtMillis = epoch(weekStart, 1, 9, 0),
                checkOutAtMillis = null,
                status = "OPEN",
                source = "MOBILE"
            )
        )

        val result = useCase(weekStart, OvertimeStrategy.ACTUAL, emptyList(), entries, profile)

        assertEquals(540, result.totalMinutes)
    }

    private fun shift(id: Long, weekStart: LocalDate, dayOffset: Int, startHour: Int, endHour: Int): ShiftRecord {
        val start = LocalDateTime.of(weekStart.plusDays(dayOffset.toLong()), LocalTime.of(startHour, 0))
        val endDate = if (endHour <= startHour) weekStart.plusDays(dayOffset.toLong() + 1) else weekStart.plusDays(dayOffset.toLong())
        val end = LocalDateTime.of(endDate, LocalTime.of(endHour % 24, 0))
        return ShiftRecord(
            id = id,
            title = "Shift $id",
            note = null,
            startAtMillis = start.atZone(zoneId).toInstant().toEpochMilli(),
            endAtMillis = end.atZone(zoneId).toInstant().toEpochMilli()
        )
    }

    private fun epoch(weekStart: LocalDate, dayOffset: Int, hour: Int, minute: Int): Long {
        return LocalDateTime.of(weekStart.plusDays(dayOffset.toLong()), LocalTime.of(hour, minute))
            .atZone(zoneId)
            .toInstant()
            .toEpochMilli()
    }
}
