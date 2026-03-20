package com.vardiya.android.reminders

import android.content.Context
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

interface ReminderScheduler {
    fun schedule(shiftId: Long, title: String, shiftStartAtMillis: Long, remindAtMillis: Long)
    fun cancel(shiftId: Long)
}

class WorkManagerReminderScheduler(
    private val context: Context
) : ReminderScheduler {
    private val workManager: WorkManager by lazy { WorkManager.getInstance(context) }

    override fun schedule(shiftId: Long, title: String, shiftStartAtMillis: Long, remindAtMillis: Long) {
        val initialDelay = (remindAtMillis - System.currentTimeMillis()).coerceAtLeast(0L)
        val request = OneTimeWorkRequestBuilder<ShiftReminderWorker>()
            .setInitialDelay(initialDelay, TimeUnit.MILLISECONDS)
            .setInputData(
                Data.Builder()
                    .putLong(ShiftReminderWorker.KEY_SHIFT_ID, shiftId)
                    .putString(ShiftReminderWorker.KEY_TITLE, title)
                    .putLong(ShiftReminderWorker.KEY_SHIFT_START_AT, shiftStartAtMillis)
                    .build()
            )
            .build()

        workManager.enqueueUniqueWork(uniqueName(shiftId), ExistingWorkPolicy.REPLACE, request)
    }

    override fun cancel(shiftId: Long) {
        workManager.cancelUniqueWork(uniqueName(shiftId))
    }

    private fun uniqueName(shiftId: Long): String = "shift-reminder-$shiftId"
}
