package com.vardiya.android.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vardiya.android.app.AppContainer
import com.vardiya.android.domain.model.PayProfile
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class SettingsUiState(
    val profile: PayProfile = PayProfile.Default,
    val proUnlocked: Boolean = false,
    val billingReady: Boolean = false
)

class SettingsViewModel(
    private val container: AppContainer
) : ViewModel() {
    val uiState: StateFlow<SettingsUiState> = combine(
        container.payProfileRepository.observeProfile(),
        container.appPreferencesRepository.proUnlocked,
        container.billingGateway.uiState
    ) { profile, proUnlocked, billing ->
        SettingsUiState(
            profile = profile,
            proUnlocked = proUnlocked,
            billingReady = billing.isReady && billing.productAvailable
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = SettingsUiState()
    )

    fun saveProfile(profile: PayProfile) {
        viewModelScope.launch {
            container.payProfileRepository.update(profile)
        }
    }

    fun unlockDebugPro() {
        viewModelScope.launch {
            container.appPreferencesRepository.setProUnlocked(true)
        }
    }
}
