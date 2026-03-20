package com.vardiya.android.billing

import android.app.Activity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class NoopBillingGateway : BillingGateway {
    private val state = MutableStateFlow(BillingUiState(isReady = false, productAvailable = false))
    override val uiState: StateFlow<BillingUiState> = state

    override fun start() = Unit

    override fun launchProPurchase(activity: Activity, onUnavailable: (String) -> Unit) {
        onUnavailable("Play Billing urun kaydi henuz baglanmadi.")
    }
}
