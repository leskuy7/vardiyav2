package com.vardiya.android.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.vardiya.android.domain.model.PayProfile

@Composable
fun SettingsScreen(
    modifier: Modifier = Modifier,
    viewModel: SettingsViewModel,
    onUpgradeRequested: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var hourlyRate by remember { mutableStateOf("0") }
    var weeklyHours by remember { mutableStateOf("45") }
    var overtimeMultiplier by remember { mutableStateOf("1.5") }
    var currencyCode by remember { mutableStateOf("TRY") }

    LaunchedEffect(uiState.profile) {
        hourlyRate = uiState.profile.hourlyRate.toString()
        weeklyHours = uiState.profile.maxWeeklyHours.toString()
        overtimeMultiplier = uiState.profile.overtimeMultiplier.toString()
        currencyCode = uiState.profile.currencyCode
    }

    LazyColumn(
        modifier = modifier.padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Ayarlar", style = MaterialTheme.typography.headlineMedium)
        }

        item {
            Card {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Ucret profili", style = MaterialTheme.typography.titleMedium)
                    OutlinedTextField(hourlyRate, { hourlyRate = it }, label = { Text("Saatlik ucret") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(weeklyHours, { weeklyHours = it }, label = { Text("Haftalik limit") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(overtimeMultiplier, { overtimeMultiplier = it }, label = { Text("Mesai carpani") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(currencyCode, { currencyCode = it.uppercase() }, label = { Text("Para birimi") }, modifier = Modifier.fillMaxWidth())
                    Button(
                        onClick = {
                            viewModel.saveProfile(
                                PayProfile(
                                    hourlyRate = hourlyRate.toDoubleOrNull() ?: 0.0,
                                    maxWeeklyHours = weeklyHours.toIntOrNull() ?: 45,
                                    overtimeMultiplier = overtimeMultiplier.toDoubleOrNull() ?: 1.5,
                                    currencyCode = currencyCode.ifBlank { "TRY" }
                                )
                            )
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Ayarlari kaydet")
                    }
                }
            }
        }

        item {
            Card {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Yayin hazirligi", style = MaterialTheme.typography.titleMedium)
                    Text("Privacy policy, KVKK aydinlatma metni, Data safety ve internal test track notlari docs/mobile altinda tutulur.")
                    Text("Play Billing hazir: ${if (uiState.billingReady) "urun baglandi" else "urun kaydi bekleniyor"}")
                }
            }
        }

        item {
            Card {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Vardiya Pro", style = MaterialTheme.typography.titleMedium)
                    Text(if (uiState.proUnlocked) "Pro ozellikleri aktif." else "ACTUAL mode, export ve coklu profil icin Pro gerekir.")
                    Button(onClick = onUpgradeRequested, modifier = Modifier.fillMaxWidth()) {
                        Text(if (uiState.proUnlocked) "Pro detaylarini gor" else "Pro ozelliklerini ac")
                    }
                }
            }
        }
    }
}
