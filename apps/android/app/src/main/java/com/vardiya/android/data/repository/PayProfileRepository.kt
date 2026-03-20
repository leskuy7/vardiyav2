package com.vardiya.android.data.repository

import com.vardiya.android.data.local.dao.PayProfileDao
import com.vardiya.android.data.local.entity.PayProfileEntity
import com.vardiya.android.domain.model.PayProfile
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class PayProfileRepository(
    private val payProfileDao: PayProfileDao
) {
    fun observeProfile(): Flow<PayProfile> = payProfileDao.observe().map { entity -> entity?.toDomain() ?: PayProfile.Default }

    suspend fun ensureDefaultProfile() {
        if (payProfileDao.find() == null) {
            payProfileDao.upsert(PayProfile.Default.toEntity())
        }
    }

    suspend fun update(profile: PayProfile) {
        payProfileDao.upsert(profile.toEntity())
    }

    private fun PayProfileEntity.toDomain(): PayProfile = PayProfile(
        hourlyRate = hourlyRate,
        maxWeeklyHours = maxWeeklyHours,
        overtimeMultiplier = overtimeMultiplier,
        currencyCode = currencyCode
    )

    private fun PayProfile.toEntity(): PayProfileEntity = PayProfileEntity(
        hourlyRate = hourlyRate,
        maxWeeklyHours = maxWeeklyHours,
        overtimeMultiplier = overtimeMultiplier,
        currencyCode = currencyCode
    )
}
