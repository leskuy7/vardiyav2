package com.vardiya.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.vardiya.android.data.local.entity.TimeEntryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TimeEntryDao {
    @Query("SELECT * FROM time_entries WHERE checkInAtMillis < :rangeEnd AND COALESCE(checkOutAtMillis, checkInAtMillis) >= :rangeStart ORDER BY checkInAtMillis ASC")
    fun observeBetween(rangeStart: Long, rangeEnd: Long): Flow<List<TimeEntryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entry: TimeEntryEntity): Long

    @Update
    suspend fun update(entry: TimeEntryEntity)

    @Query("SELECT * FROM time_entries WHERE status = 'OPEN' ORDER BY checkInAtMillis DESC LIMIT 1")
    suspend fun findActive(): TimeEntryEntity?

    @Query("SELECT * FROM time_entries ORDER BY checkInAtMillis DESC")
    fun observeAll(): Flow<List<TimeEntryEntity>>
}
