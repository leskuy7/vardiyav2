package com.vardiya.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.vardiya.android.data.local.entity.PayProfileEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PayProfileDao {
    @Query("SELECT * FROM pay_profile WHERE id = 1")
    fun observe(): Flow<PayProfileEntity?>

    @Query("SELECT * FROM pay_profile WHERE id = 1")
    suspend fun find(): PayProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(profile: PayProfileEntity)
}
