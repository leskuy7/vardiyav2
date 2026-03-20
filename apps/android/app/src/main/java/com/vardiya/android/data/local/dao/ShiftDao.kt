package com.vardiya.android.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.vardiya.android.data.local.entity.ShiftEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ShiftDao {
    @Query("SELECT * FROM shifts WHERE endAtMillis > :rangeStart AND startAtMillis < :rangeEnd ORDER BY startAtMillis ASC")
    fun observeBetween(rangeStart: Long, rangeEnd: Long): Flow<List<ShiftEntity>>

    @Query("SELECT * FROM shifts WHERE endAtMillis > :rangeStart AND startAtMillis < :rangeEnd ORDER BY startAtMillis ASC")
    suspend fun findBetween(rangeStart: Long, rangeEnd: Long): List<ShiftEntity>

    @Query("SELECT * FROM shifts ORDER BY startAtMillis ASC")
    fun observeAll(): Flow<List<ShiftEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(shift: ShiftEntity): Long

    @Delete
    suspend fun delete(shift: ShiftEntity)

    @Query("DELETE FROM shifts WHERE id = :shiftId")
    suspend fun deleteById(shiftId: Long)
}
