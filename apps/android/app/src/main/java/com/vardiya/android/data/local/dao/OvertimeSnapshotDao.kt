package com.vardiya.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.vardiya.android.data.local.entity.OvertimeSnapshotEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OvertimeSnapshotDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(snapshot: OvertimeSnapshotEntity)

    @Query("SELECT * FROM overtime_snapshots WHERE weekStartIso = :weekStartIso AND strategy = :strategy LIMIT 1")
    fun observe(weekStartIso: String, strategy: String): Flow<OvertimeSnapshotEntity?>
}
