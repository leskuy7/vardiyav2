package com.vardiya.android.reminders

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.vardiya.android.R
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class ShiftReminderWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                applicationContext,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                return Result.success()
            }
        }

        val title = inputData.getString(KEY_TITLE) ?: "Yaklasan vardiya"
        val shiftStartAtMillis = inputData.getLong(KEY_SHIFT_START_AT, -1L)
        val body = if (shiftStartAtMillis > 0L) {
            val formatter = DateTimeFormatter.ofPattern("dd MMM HH:mm").withZone(ZoneId.of("Europe/Istanbul"))
            "Vardiyan ${formatter.format(Instant.ofEpochMilli(shiftStartAtMillis))} saatinde basliyor."
        } else {
            "Yakin vardiyan icin hazirlik zamani."
        }

        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_app_icon)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(inputData.getLong(KEY_SHIFT_ID, 0L).toInt(), notification)
        return Result.success()
    }

    companion object {
        const val CHANNEL_ID = "shift-reminders"
        const val KEY_SHIFT_ID = "shift_id"
        const val KEY_TITLE = "title"
        const val KEY_SHIFT_START_AT = "shift_start_at"
    }
}
