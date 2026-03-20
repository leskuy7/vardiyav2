package com.vardiya.android.data.repository

import com.vardiya.android.data.local.dao.OvertimeSnapshotDao
import com.vardiya.android.data.local.entity.OvertimeSnapshotEntity
import com.vardiya.android.domain.model.OvertimeSummary
import java.time.LocalDate

class OvertimeSnapshotRepository(
    private val overtimeSnapshotDao: OvertimeSnapshotDao
) {
    suspend fun save(weekStart: LocalDate, summary: OvertimeSummary) {
        overtimeSnapshotDao.upsert(
            OvertimeSnapshotEntity(
                id = "${weekStart}_${summary.strategy}",
                weekStartIso = weekStart.toString(),
                strategy = summary.strategy.name,
                totalMinutes = summary.totalMinutes,
                regularMinutes = summary.regularMinutes,
                overtimeMinutes = summary.overtimeMinutes,
                estimatedPay = summary.estimatedPay,
                currencyCode = summary.currencyCode,
                createdAtMillis = System.currentTimeMillis()
            )
        )
    }
}
