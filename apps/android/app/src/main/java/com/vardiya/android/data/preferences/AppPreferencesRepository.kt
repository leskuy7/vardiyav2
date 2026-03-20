package com.vardiya.android.data.preferences

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.vardiya.android.domain.model.OvertimeStrategy
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private const val APP_PREFERENCES = "vardiya_android_prefs"

private val Context.dataStore by preferencesDataStore(name = APP_PREFERENCES)

class AppPreferencesRepository(
    private val context: Context
) {
    private object Keys {
        val onboardingCompleted = booleanPreferencesKey("onboarding_completed")
        val selectedStrategy = stringPreferencesKey("selected_strategy")
        val proUnlocked = booleanPreferencesKey("pro_unlocked")
    }

    val onboardingCompleted: Flow<Boolean> = context.dataStore.data.map { it[Keys.onboardingCompleted] ?: false }
    val selectedStrategy: Flow<OvertimeStrategy> = context.dataStore.data.map { preferences ->
        when (preferences[Keys.selectedStrategy]) {
            OvertimeStrategy.ACTUAL.name -> OvertimeStrategy.ACTUAL
            else -> OvertimeStrategy.PLANNED
        }
    }
    val proUnlocked: Flow<Boolean> = context.dataStore.data.map { it[Keys.proUnlocked] ?: false }

    suspend fun setOnboardingCompleted(completed: Boolean) {
        context.dataStore.edit { it[Keys.onboardingCompleted] = completed }
    }

    suspend fun setSelectedStrategy(strategy: OvertimeStrategy) {
        context.dataStore.edit { it[Keys.selectedStrategy] = strategy.name }
    }

    suspend fun setProUnlocked(unlocked: Boolean) {
        context.dataStore.edit { it[Keys.proUnlocked] = unlocked }
    }
}
