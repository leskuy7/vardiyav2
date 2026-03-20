package com.vardiya.android.data.repository

import com.vardiya.android.data.local.dao.TimeEntryDao
import com.vardiya.android.data.local.entity.TimeEntryEntity
import com.vardiya.android.domain.model.TimeEntryRecord
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class TimeEntryRepository(
    private val timeEntryDao: TimeEntryDao,
    private val zoneId: ZoneId = ZoneId.of("Europe/Istanbul")
) {
    fun observeWeek(weekStart: LocalDate): Flow<List<TimeEntryRecord>> {
        val rangeStart = weekStart.atStartOfDay(zoneId).toInstant().toEpochMilli()
        val rangeEnd = weekStart.plusDays(7).atStartOfDay(zoneId).toInstant().toEpochMilli()
        return timeEntryDao.observeBetween(rangeStart, rangeEnd).map { entries -> entries.map { it.toDomain() } }
    }

    suspend fun startTracking(shiftId: Long?) {
        timeEntryDao.insert(
            TimeEntryEntity(
                shiftId = shiftId,
                checkInAtMillis = System.currentTimeMillis(),
                checkOutAtMillis = null,
                status = "OPEN",
                source = "MOBILE",
                createdAtMillis = System.currentTimeMillis()
            )
        )
    }

    suspend fun stopTracking() {
        val active = timeEntryDao.findActive() ?: return
        timeEntryDao.update(
            active.copy(
                checkOutAtMillis = System.currentTimeMillis(),
                status = "CLOSED"
            )
        )
    }

    suspend fun addManualEntry(shiftId: Long?, checkInAtMillis: Long, checkOutAtMillis: Long) {
        timeEntryDao.insert(
            TimeEntryEntity(
                shiftId = shiftId,
                checkInAtMillis = checkInAtMillis,
                checkOutAtMillis = checkOutAtMillis,
                status = "CLOSED",
                source = "MANUAL",
                createdAtMillis = System.currentTimeMillis()
            )
        )
    }

    fun observeAll(): Flow<List<TimeEntryRecord>> = timeEntryDao.observeAll().map { entries -> entries.map { it.toDomain() } }

    private fun TimeEntryEntity.toDomain(): TimeEntryRecord = TimeEntryRecord(
        id = id,
        shiftId = shiftId,
        checkInAtMillis = checkInAtMillis,
        checkOutAtMillis = checkOutAtMillis,
        status = status,
        source = source
    )
}
