package com.vardiya.android.ui.shifts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vardiya.android.app.AppContainer
import com.vardiya.android.domain.model.ShiftRecord
import com.vardiya.android.ui.currentWeekStart
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class ShiftsUiState(
    val weekStart: java.time.LocalDate = currentWeekStart(),
    val shifts: List<ShiftRecord> = emptyList(),
    val reminderShiftIds: Set<Long> = emptySet()
)

@OptIn(ExperimentalCoroutinesApi::class)
class ShiftsViewModel(
    private val container: AppContainer
) : ViewModel() {
    private val weekStart = MutableStateFlow(currentWeekStart())

    val uiState: StateFlow<ShiftsUiState> = combine(
        weekStart,
        weekStart.flatMapLatest { container.shiftRepository.observeWeek(it) },
        container.reminderRepository.observeReminderMap()
    ) { weekStartValue, shifts, reminders ->
        ShiftsUiState(
            weekStart = weekStartValue,
            shifts = shifts,
            reminderShiftIds = reminders.keys
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = ShiftsUiState()
    )

    fun previousWeek() {
        weekStart.value = weekStart.value.minusDays(7)
    }

    fun nextWeek() {
        weekStart.value = weekStart.value.plusDays(7)
    }

    fun addShift(title: String, note: String?, startAtMillis: Long, endAtMillis: Long) {
        viewModelScope.launch {
            container.shiftRepository.addShift(title, note, startAtMillis, endAtMillis)
            container.analyticsTracker.track("shift_created")
        }
    }

    fun deleteShift(shiftId: Long) {
        viewModelScope.launch {
            container.reminderRepository.disableReminder(shiftId)
            container.reminderScheduler.cancel(shiftId)
            container.shiftRepository.deleteShift(shiftId)
        }
    }

    fun setReminder(shift: ShiftRecord, enabled: Boolean, leadMinutes: Int = 30) {
        viewModelScope.launch {
            if (enabled) {
                val remindAt = shift.startAtMillis - (leadMinutes * 60_000L)
                container.reminderRepository.enableReminder(shift.id, remindAt, leadMinutes)
                container.reminderScheduler.schedule(
                    shiftId = shift.id,
                    title = shift.title,
                    shiftStartAtMillis = shift.startAtMillis,
                    remindAtMillis = remindAt
                )
            } else {
                container.reminderRepository.disableReminder(shift.id)
                container.reminderScheduler.cancel(shift.id)
            }
        }
    }
}
