package com.vardiya.android.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.vardiya.android.app.AppContainer
import com.vardiya.android.ui.home.HomeScreen
import com.vardiya.android.ui.onboarding.OnboardingScreen

@Composable
fun VardiyaApp(
    container: AppContainer
) {
    val appViewModel: AppViewModel = viewModel(factory = AppViewModelFactory { AppViewModel(container) })
    val appState by appViewModel.uiState.collectAsStateWithLifecycle()

    Surface(modifier = Modifier.fillMaxSize()) {
        when {
            appState.isLoading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }

            !appState.onboardingCompleted -> OnboardingScreen(
                onComplete = appViewModel::completeOnboarding
            )

            else -> HomeScreen(
                container = container,
                appState = appState,
                onStrategySelected = appViewModel::setSelectedStrategy
            )
        }
    }
}
