package com.vardiya.android.ui.home

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Assessment
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.vardiya.android.app.AppContainer
import com.vardiya.android.domain.model.OvertimeStrategy
import com.vardiya.android.ui.AppRootState
import com.vardiya.android.ui.AppViewModelFactory
import com.vardiya.android.ui.report.ProPaywallSheet
import com.vardiya.android.ui.report.ReportScreen
import com.vardiya.android.ui.report.ReportViewModel
import com.vardiya.android.ui.settings.SettingsScreen
import com.vardiya.android.ui.settings.SettingsViewModel
import com.vardiya.android.ui.shifts.ShiftsScreen
import com.vardiya.android.ui.shifts.ShiftsViewModel
import kotlinx.coroutines.launch

private enum class HomeTab(val label: String) {
    SHIFTS("Vardiyalar"),
    REPORTS("Rapor"),
    SETTINGS("Ayarlar")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    container: AppContainer,
    appState: AppRootState,
    onStrategySelected: (OvertimeStrategy) -> Unit
) {
    var selectedTab by remember { mutableStateOf(HomeTab.SHIFTS) }
    var showPaywall by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val shiftsViewModel: ShiftsViewModel = viewModel(factory = AppViewModelFactory { ShiftsViewModel(container) })
    val reportViewModel: ReportViewModel = viewModel(factory = AppViewModelFactory { ReportViewModel(container) })
    val settingsViewModel: SettingsViewModel = viewModel(factory = AppViewModelFactory { SettingsViewModel(container) })

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted) {
            scope.launch {
                snackbarHostState.showSnackbar("Bildirim izni olmadan hatirlatma acilamaz.")
            }
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = selectedTab == HomeTab.SHIFTS,
                    onClick = { selectedTab = HomeTab.SHIFTS },
                    icon = { Icon(Icons.Outlined.CalendarMonth, contentDescription = null) },
                    label = { Text(HomeTab.SHIFTS.label) }
                )
                NavigationBarItem(
                    selected = selectedTab == HomeTab.REPORTS,
                    onClick = { selectedTab = HomeTab.REPORTS },
                    icon = { Icon(Icons.Outlined.Assessment, contentDescription = null) },
                    label = { Text(HomeTab.REPORTS.label) }
                )
                NavigationBarItem(
                    selected = selectedTab == HomeTab.SETTINGS,
                    onClick = { selectedTab = HomeTab.SETTINGS },
                    icon = { Icon(Icons.Outlined.Settings, contentDescription = null) },
                    label = { Text(HomeTab.SETTINGS.label) }
                )
            }
        }
    ) { innerPadding ->
        when (selectedTab) {
            HomeTab.SHIFTS -> ShiftsScreen(
                modifier = Modifier.padding(innerPadding),
                viewModel = shiftsViewModel,
                onRequestNotificationPermission = {
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                        true
                    } else {
                        val granted = ContextCompat.checkSelfPermission(
                            context,
                            Manifest.permission.POST_NOTIFICATIONS
                        ) == PackageManager.PERMISSION_GRANTED
                        if (!granted) {
                            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                        }
                        granted
                    }
                },
                onReminderPermissionMissing = {
                    scope.launch { snackbarHostState.showSnackbar("Hatirlatma icin once bildirim izni ver.") }
                }
            )

            HomeTab.REPORTS -> ReportScreen(
                modifier = Modifier.padding(innerPadding),
                viewModel = reportViewModel,
                appState = appState,
                onSelectStrategy = onStrategySelected,
                onUpgradeRequested = { showPaywall = true }
            )

            HomeTab.SETTINGS -> SettingsScreen(
                modifier = Modifier.padding(innerPadding),
                viewModel = settingsViewModel,
                onUpgradeRequested = { showPaywall = true }
            )
        }
    }

    if (showPaywall) {
        ModalBottomSheet(
            onDismissRequest = { showPaywall = false },
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            ProPaywallSheet(
                viewModel = settingsViewModel,
                onClose = { showPaywall = false },
                onUnavailable = { message ->
                    scope.launch { snackbarHostState.showSnackbar(message) }
                }
            )
        }
    }
}
