package com.vardiya.android.app

import android.content.Context
import com.vardiya.android.billing.BillingGateway
import com.vardiya.android.billing.NoopBillingGateway
import com.vardiya.android.data.local.VardiyaDatabase
import com.vardiya.android.data.preferences.AppPreferencesRepository
import com.vardiya.android.data.repository.OvertimeSnapshotRepository
import com.vardiya.android.data.repository.PayProfileRepository
import com.vardiya.android.data.repository.ReminderRepository
import com.vardiya.android.data.repository.ShiftRepository
import com.vardiya.android.data.repository.TimeEntryRepository
import com.vardiya.android.domain.usecase.CalculateMonthlySummaryUseCase
import com.vardiya.android.domain.usecase.CalculateWeeklyOvertimeUseCase
import com.vardiya.android.reminders.ReminderScheduler
import com.vardiya.android.reminders.WorkManagerReminderScheduler
import com.vardiya.android.telemetry.AnalyticsTracker
import com.vardiya.android.telemetry.CrashReporter
import com.vardiya.android.telemetry.NoopAnalyticsTracker
import com.vardiya.android.telemetry.NoopCrashReporter

class AppContainer(context: Context) {
    private val appContext = context.applicationContext
    private val database = VardiyaDatabase.create(appContext)

    val analyticsTracker: AnalyticsTracker = NoopAnalyticsTracker
    val crashReporter: CrashReporter = NoopCrashReporter
    val billingGateway: BillingGateway = NoopBillingGateway()
    val reminderScheduler: ReminderScheduler = WorkManagerReminderScheduler(appContext)

    val appPreferencesRepository = AppPreferencesRepository(appContext)
    val shiftRepository = ShiftRepository(database.shiftDao())
    val timeEntryRepository = TimeEntryRepository(database.timeEntryDao())
    val payProfileRepository = PayProfileRepository(database.payProfileDao())
    val overtimeSnapshotRepository = OvertimeSnapshotRepository(database.overtimeSnapshotDao())
    val reminderRepository = ReminderRepository(database.reminderDao())

    val calculateWeeklyOvertimeUseCase = CalculateWeeklyOvertimeUseCase()
    val calculateMonthlySummaryUseCase = CalculateMonthlySummaryUseCase(calculateWeeklyOvertimeUseCase)
}
