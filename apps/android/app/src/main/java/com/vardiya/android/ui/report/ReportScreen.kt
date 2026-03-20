package com.vardiya.android.ui.report

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.vardiya.android.domain.model.OvertimeStrategy
import com.vardiya.android.ui.AppRootState
import com.vardiya.android.ui.formatCurrency
import com.vardiya.android.ui.formatDateTime
import com.vardiya.android.ui.formatDurationMinutes
import com.vardiya.android.ui.formatWeekLabel

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ReportScreen(
    modifier: Modifier = Modifier,
    viewModel: ReportViewModel,
    appState: AppRootState,
    onSelectStrategy: (OvertimeStrategy) -> Unit,
    onUpgradeRequested: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = modifier.padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Mesai raporu", style = MaterialTheme.typography.headlineMedium)
            Text("Hafta: ${formatWeekLabel(uiState.weekStart)}")
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = viewModel::previousWeek) { Text("Onceki") }
                OutlinedButton(onClick = viewModel::nextWeek) { Text("Sonraki") }
            }
        }

        item {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(
                    onClick = {
                        viewModel.selectStrategy(OvertimeStrategy.PLANNED)
                        onSelectStrategy(OvertimeStrategy.PLANNED)
                    },
                    label = { Text("Planned") }
                )
                AssistChip(
                    onClick = {
                        if (appState.proUnlocked) {
                            viewModel.selectStrategy(OvertimeStrategy.ACTUAL)
                            onSelectStrategy(OvertimeStrategy.ACTUAL)
                        } else {
                            onUpgradeRequested()
                        }
                    },
                    label = { Text(if (appState.proUnlocked) "Actual" else "Actual (Pro)") }
                )
            }
        }

        item {
            Card {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Haftalik ozet", style = MaterialTheme.typography.titleLarge)
                    Text("Toplam: ${formatDurationMinutes(uiState.weeklySummary.totalMinutes)}")
                    Text("Normal: ${formatDurationMinutes(uiState.weeklySummary.regularMinutes)}")
                    Text("Mesai: ${formatDurationMinutes(uiState.weeklySummary.overtimeMinutes)}")
                    Text("Tahmini ucret: ${formatCurrency(uiState.weeklySummary.estimatedPay, uiState.weeklySummary.currencyCode)}")
                }
            }
        }

        item {
            Card {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Aylik ozet", style = MaterialTheme.typography.titleLarge)
                    Text("Toplam: ${formatDurationMinutes(uiState.monthlySummary.totalMinutes)}")
                    Text("Mesai: ${formatDurationMinutes(uiState.monthlySummary.overtimeMinutes)}")
                    Text("Tahmini ucret: ${formatCurrency(uiState.monthlySummary.estimatedPay, uiState.monthlySummary.currencyCode)}")
                }
            }
        }

        if (appState.proUnlocked) {
            item {
                Card {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("ACTUAL mode", style = MaterialTheme.typography.titleMedium)
                        Text("Acik kayit: ${uiState.activeEntry?.let { formatDateTime(it.checkInAtMillis) } ?: "Yok"}")
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Button(onClick = viewModel::checkIn, enabled = uiState.activeEntry == null) {
                                Text("Giris yap")
                            }
                            OutlinedButton(onClick = viewModel::checkOut, enabled = uiState.activeEntry != null) {
                                Text("Cikis yap")
                            }
                        }
                    }
                }
            }
        }

        item {
            Text("Bu haftaki time entry kayitlari", style = MaterialTheme.typography.titleMedium)
        }

        if (uiState.timeEntries.isEmpty()) {
            item {
                Card {
                    Text(
                        text = "Bu hafta time entry yok. Planned hesap yine de calisir.",
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
        } else {
            items(uiState.timeEntries, key = { it.id }) { entry ->
                Card {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(if (entry.status == "OPEN") "Acik kayit" else "Kapali kayit")
                        Text("Giris: ${formatDateTime(entry.checkInAtMillis)}")
                        Text("Cikis: ${entry.checkOutAtMillis?.let(::formatDateTime) ?: "-"}")
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
