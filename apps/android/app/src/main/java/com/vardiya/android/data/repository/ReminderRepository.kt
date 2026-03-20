package com.vardiya.android.data.repository

import com.vardiya.android.data.local.dao.ReminderDao
import com.vardiya.android.data.local.entity.ReminderEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class ReminderRepository(
    private val reminderDao: ReminderDao
) {
    fun observeReminderMap(): Flow<Map<Long, ReminderEntity>> = reminderDao.observeAll().map { reminders ->
        reminders.associateBy { it.shiftId }
    }

    suspend fun enableReminder(shiftId: Long, remindAtMillis: Long, leadMinutes: Int) {
        reminderDao.upsert(
            ReminderEntity(
                shiftId = shiftId,
                remindAtMillis = remindAtMillis,
                leadMinutes = leadMinutes,
                enabled = true
            )
        )
    }

    suspend fun disableReminder(shiftId: Long) {
        reminderDao.deleteByShiftId(shiftId)
    }
}
