package com.vardiya.android.ui.report

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vardiya.android.app.AppContainer
import com.vardiya.android.domain.model.MonthlySummary
import com.vardiya.android.domain.model.OvertimeStrategy
import com.vardiya.android.domain.model.OvertimeSummary
import com.vardiya.android.domain.model.PayProfile
import com.vardiya.android.domain.model.TimeEntryRecord
import com.vardiya.android.ui.currentWeekStart
import java.time.YearMonth
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class ReportUiState(
    val weekStart: java.time.LocalDate = currentWeekStart(),
    val payProfile: PayProfile = PayProfile.Default,
    val selectedStrategy: OvertimeStrategy = OvertimeStrategy.PLANNED,
    val weeklySummary: OvertimeSummary = OvertimeSummary(OvertimeStrategy.PLANNED, 0, 0, 0, 0.0, "TRY"),
    val monthlySummary: MonthlySummary = MonthlySummary(0, 0, 0.0, "TRY"),
    val timeEntries: List<TimeEntryRecord> = emptyList(),
    val activeEntry: TimeEntryRecord? = null,
    val proUnlocked: Boolean = false
)

@OptIn(ExperimentalCoroutinesApi::class)
class ReportViewModel(
    private val container: AppContainer
) : ViewModel() {
    private val weekStart = MutableStateFlow(currentWeekStart())
    private val weekShifts = weekStart.flatMapLatest { container.shiftRepository.observeWeek(it) }
    private val weekEntries = weekStart.flatMapLatest { container.timeEntryRepository.observeWeek(it) }
    private val baseState = combine(
        weekStart,
        container.payProfileRepository.observeProfile(),
        container.appPreferencesRepository.selectedStrategy,
        container.appPreferencesRepository.proUnlocked
    ) { weekStartValue, payProfile, strategy, proUnlocked ->
        BaseReportState(
            weekStart = weekStartValue,
            payProfile = payProfile,
            strategy = strategy,
            proUnlocked = proUnlocked
        )
    }

    val uiState: StateFlow<ReportUiState> = combine(
        baseState,
        weekShifts,
        weekEntries,
        container.shiftRepository.observeAll(),
        container.timeEntryRepository.observeAll()
    ) { base, weekShiftsValue, weekEntriesValue, allShifts, allEntries ->
        val weeklySummary = container.calculateWeeklyOvertimeUseCase(
            weekStart = base.weekStart,
            strategy = base.strategy,
            shifts = weekShiftsValue,
            timeEntries = weekEntriesValue,
            payProfile = base.payProfile
        )
        val monthlySummary = container.calculateMonthlySummaryUseCase(
            month = YearMonth.from(base.weekStart),
            strategy = base.strategy,
            shifts = allShifts,
            timeEntries = allEntries,
            payProfile = base.payProfile
        )

        viewModelScope.launch {
            container.overtimeSnapshotRepository.save(base.weekStart, weeklySummary)
        }

        ReportUiState(
            weekStart = base.weekStart,
            payProfile = base.payProfile,
            selectedStrategy = base.strategy,
            weeklySummary = weeklySummary,
            monthlySummary = monthlySummary,
            timeEntries = weekEntriesValue,
            activeEntry = allEntries.firstOrNull { it.status == "OPEN" },
            proUnlocked = base.proUnlocked
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = ReportUiState()
    )

    fun previousWeek() {
        weekStart.value = weekStart.value.minusDays(7)
    }

    fun nextWeek() {
        weekStart.value = weekStart.value.plusDays(7)
    }

    fun selectStrategy(strategy: OvertimeStrategy) {
        viewModelScope.launch {
            container.appPreferencesRepository.setSelectedStrategy(strategy)
        }
    }

    fun checkIn() {
        viewModelScope.launch {
            container.timeEntryRepository.startTracking(shiftId = null)
        }
    }

    fun checkOut() {
        viewModelScope.launch {
            container.timeEntryRepository.stopTracking()
        }
    }
}

private data class BaseReportState(
    val weekStart: java.time.LocalDate,
    val payProfile: PayProfile,
    val strategy: OvertimeStrategy,
    val proUnlocked: Boolean
)
