package com.vardiya.android.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vardiya.android.app.AppContainer
import com.vardiya.android.domain.model.OvertimeStrategy
import com.vardiya.android.domain.model.PayProfile
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class AppRootState(
    val isLoading: Boolean = true,
    val onboardingCompleted: Boolean = false,
    val payProfile: PayProfile = PayProfile.Default,
    val proUnlocked: Boolean = false,
    val selectedStrategy: OvertimeStrategy = OvertimeStrategy.PLANNED
)

class AppViewModel(
    private val container: AppContainer
) : ViewModel() {
    val uiState: StateFlow<AppRootState> = combine(
        container.appPreferencesRepository.onboardingCompleted,
        container.payProfileRepository.observeProfile(),
        container.appPreferencesRepository.proUnlocked,
        container.appPreferencesRepository.selectedStrategy
    ) { onboardingCompleted, profile, proUnlocked, selectedStrategy ->
        AppRootState(
            isLoading = false,
            onboardingCompleted = onboardingCompleted,
            payProfile = profile,
            proUnlocked = proUnlocked,
            selectedStrategy = selectedStrategy
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = AppRootState()
    )

    init {
        viewModelScope.launch {
            container.payProfileRepository.ensureDefaultProfile()
        }
    }

    fun completeOnboarding(profile: PayProfile) {
        viewModelScope.launch {
            container.payProfileRepository.update(profile)
            container.appPreferencesRepository.setOnboardingCompleted(true)
            container.analyticsTracker.track("onboarding_completed")
        }
    }

    fun setSelectedStrategy(strategy: OvertimeStrategy) {
        viewModelScope.launch {
            container.appPreferencesRepository.setSelectedStrategy(strategy)
        }
    }
}
