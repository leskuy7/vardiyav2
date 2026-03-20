package com.vardiya.android.ui.report

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.vardiya.android.ui.settings.SettingsViewModel

@Composable
fun ProPaywallSheet(
    viewModel: SettingsViewModel,
    onClose: () -> Unit,
    onUnavailable: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Vardiya Pro", style = MaterialTheme.typography.headlineSmall)
        Text("PDF/CSV export, ACTUAL mode check-in/out, coklu profil ve gelismis reminder Pro ile acilir.")
        Text("Play Billing iskeleti eklendi. Uygulama ici urun kimligi baglandiginda satin alma butonu ayni akistan calisacak.")

        Button(
            onClick = {
                onUnavailable("Play Billing urunu henuz Console tarafinda tanimlanmadi.")
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Pro satin alma akisini dene")
        }

        if (com.vardiya.android.BuildConfig.DEBUG) {
            OutlinedButton(
                onClick = {
                    viewModel.unlockDebugPro()
                    onClose()
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Debug icin Pro kilidini ac")
            }
        }

        OutlinedButton(onClick = onClose, modifier = Modifier.fillMaxWidth()) {
            Text("Kapat")
        }
    }
}
