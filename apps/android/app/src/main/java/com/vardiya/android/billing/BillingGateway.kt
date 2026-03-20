package com.vardiya.android.billing

import android.app.Activity
import kotlinx.coroutines.flow.StateFlow

data class BillingUiState(
    val isReady: Boolean = false,
    val productAvailable: Boolean = false,
    val lastError: String? = null
)

interface BillingGateway {
    val uiState: StateFlow<BillingUiState>
    fun start()
    fun launchProPurchase(activity: Activity, onUnavailable: (String) -> Unit)
}
