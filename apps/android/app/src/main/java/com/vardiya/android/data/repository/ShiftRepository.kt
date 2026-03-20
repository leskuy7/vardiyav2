package com.vardiya.android.data.repository

import com.vardiya.android.data.local.dao.ShiftDao
import com.vardiya.android.data.local.entity.ShiftEntity
import com.vardiya.android.domain.model.ShiftRecord
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class ShiftRepository(
    private val shiftDao: ShiftDao,
    private val zoneId: ZoneId = ZoneId.of("Europe/Istanbul")
) {
    fun observeWeek(weekStart: LocalDate): Flow<List<ShiftRecord>> {
        val rangeStart = weekStart.atStartOfDay(zoneId).toInstant().toEpochMilli()
        val rangeEnd = weekStart.plusDays(7).atStartOfDay(zoneId).toInstant().toEpochMilli()
        return shiftDao.observeBetween(rangeStart, rangeEnd).map { entities -> entities.map { it.toDomain() } }
    }

    fun observeAll(): Flow<List<ShiftRecord>> = shiftDao.observeAll().map { entities -> entities.map { it.toDomain() } }

    suspend fun addShift(title: String, note: String?, startAtMillis: Long, endAtMillis: Long): Long {
        val now = System.currentTimeMillis()
        return shiftDao.insert(
            ShiftEntity(
                title = title,
                note = note,
                startAtMillis = startAtMillis,
                endAtMillis = endAtMillis,
                createdAtMillis = now,
                updatedAtMillis = now
            )
        )
    }

    suspend fun deleteShift(shiftId: Long) {
        shiftDao.deleteById(shiftId)
    }

    private fun ShiftEntity.toDomain(): ShiftRecord = ShiftRecord(
        id = id,
        title = title,
        note = note,
        startAtMillis = startAtMillis,
        endAtMillis = endAtMillis
    )
}
