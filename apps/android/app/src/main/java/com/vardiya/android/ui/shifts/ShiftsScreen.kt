package com.vardiya.android.ui.shifts

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.NotificationsOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.vardiya.android.domain.model.ShiftRecord
import com.vardiya.android.ui.TurkeyZoneId
import com.vardiya.android.ui.formatDateTime
import com.vardiya.android.ui.formatWeekLabel
import com.vardiya.android.ui.parseLocalDate
import com.vardiya.android.ui.parseLocalTime
import com.vardiya.android.ui.toEpochMillis
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShiftsScreen(
    modifier: Modifier = Modifier,
    viewModel: ShiftsViewModel,
    onRequestNotificationPermission: () -> Boolean,
    onReminderPermissionMissing: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showAddDialog by remember { mutableStateOf(false) }

    Scaffold(
        modifier = modifier,
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Outlined.Add, contentDescription = null)
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text("Vardiyalar", style = MaterialTheme.typography.headlineMedium)
                Text("Hafta: ${formatWeekLabel(uiState.weekStart)}")
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(onClick = viewModel::previousWeek) { Text("Onceki") }
                    OutlinedButton(onClick = viewModel::nextWeek) { Text("Sonraki") }
                }
            }

            if (uiState.shifts.isEmpty()) {
                item {
                    Card {
                        Text(
                            text = "Bu hafta vardiya yok. Sag alttan yeni vardiya ekleyebilirsin.",
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            } else {
                items(uiState.shifts, key = { it.id }) { shift ->
                    val reminderEnabled = uiState.reminderShiftIds.contains(shift.id)
                    ShiftCard(
                        shift = shift,
                        reminderEnabled = reminderEnabled,
                        onDelete = { viewModel.deleteShift(shift.id) },
                        onToggleReminder = {
                            if (!reminderEnabled) {
                                val granted = onRequestNotificationPermission()
                                if (!granted) {
                                    onReminderPermissionMissing()
                                    return@ShiftCard
                                }
                            }
                            viewModel.setReminder(shift, enabled = !reminderEnabled)
                        }
                    )
                }
            }
        }
    }

    if (showAddDialog) {
        AddShiftDialog(
            onDismiss = { showAddDialog = false },
            onConfirm = { title, note, dateText, startText, endText ->
                val date = parseLocalDate(dateText) ?: return@AddShiftDialog
                val start = parseLocalTime(startText) ?: return@AddShiftDialog
                val end = parseLocalTime(endText) ?: return@AddShiftDialog
                val startAt = toEpochMillis(date, start)
                val endAt = if (toEpochMillis(date, end) <= startAt) {
                    toEpochMillis(date.plusDays(1), end)
                } else {
                    toEpochMillis(date, end)
                }
                viewModel.addShift(title.ifBlank { "Vardiya" }, note.ifBlank { null }, startAt, endAt)
                showAddDialog = false
            }
        )
    }
}

@Composable
private fun ShiftCard(
    shift: ShiftRecord,
    reminderEnabled: Boolean,
    onDelete: () -> Unit,
    onToggleReminder: () -> Unit
) {
    Card {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(shift.title, style = MaterialTheme.typography.titleMedium)
                    Text("${formatDateTime(shift.startAtMillis)} - ${formatDateTime(shift.endAtMillis)}")
                    if (!shift.note.isNullOrBlank()) {
                        Text(shift.note, style = MaterialTheme.typography.bodyMedium)
                    }
                }
                Row {
                    IconButton(onClick = onToggleReminder) {
                        Icon(
                            if (reminderEnabled) Icons.Outlined.Notifications else Icons.Outlined.NotificationsOff,
                            contentDescription = null
                        )
                    }
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Outlined.Delete, contentDescription = null)
                    }
                }
            }
        }
    }
}

@Composable
private fun AddShiftDialog(
    onDismiss: () -> Unit,
    onConfirm: (title: String, note: String, date: String, start: String, end: String) -> Unit
) {
    var title by remember { mutableStateOf("Kisisel vardiya") }
    var note by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(LocalDate.now(TurkeyZoneId).toString()) }
    var start by remember { mutableStateOf("09:00") }
    var end by remember { mutableStateOf("18:00") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Yeni vardiya") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(title, { title = it }, label = { Text("Baslik") })
                OutlinedTextField(note, { note = it }, label = { Text("Not") })
                OutlinedTextField(date, { date = it }, label = { Text("Tarih (YYYY-MM-DD)") })
                OutlinedTextField(start, { start = it }, label = { Text("Baslangic (HH:mm)") })
                OutlinedTextField(end, { end = it }, label = { Text("Bitis (HH:mm)") })
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(title, note, date, start, end) }) {
                Text("Kaydet")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Iptal")
            }
        }
    )
}
