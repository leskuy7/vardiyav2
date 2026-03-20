package com.vardiya.android.ui.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.vardiya.android.domain.model.PayProfile

@Composable
fun OnboardingScreen(
    onComplete: (PayProfile) -> Unit
) {
    var hourlyRate by remember { mutableStateOf("0") }
    var weeklyHours by remember { mutableStateOf("45") }
    var overtimeMultiplier by remember { mutableStateOf("1.5") }
    var currencyCode by remember { mutableStateOf("TRY") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Vardiya / Mesai Hesaplayici",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Ilk surum kisisel ve offline calisir. Hesap acmadan vardiya ekleyebilir, haftalik mesaini ve tahmini ucretini gorebilirsin."
        )

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Varsayilan ucret ve mesai ayarlari", style = MaterialTheme.typography.titleMedium)
                OutlinedTextField(hourlyRate, { hourlyRate = it }, label = { Text("Saatlik ucret") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(weeklyHours, { weeklyHours = it }, label = { Text("Haftalik limit (saat)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(overtimeMultiplier, { overtimeMultiplier = it }, label = { Text("Mesai carpani") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(currencyCode, { currencyCode = it.uppercase() }, label = { Text("Para birimi") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            }
        }

        Text(
            text = "Ucretsiz surum: tek profil, planned hesap, temel rapor. Pro: PDF/CSV export, coklu profil, ACTUAL mode ve gelismis reminder."
        )

        Spacer(modifier = Modifier.height(8.dp))

        Button(
            onClick = {
                onComplete(
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
            Text("Kisisel modu baslat")
        }
    }
}
