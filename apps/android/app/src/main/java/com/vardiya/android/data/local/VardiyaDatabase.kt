package com.vardiya.android.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.vardiya.android.data.local.dao.OvertimeSnapshotDao
import com.vardiya.android.data.local.dao.PayProfileDao
import com.vardiya.android.data.local.dao.ReminderDao
import com.vardiya.android.data.local.dao.ShiftDao
import com.vardiya.android.data.local.dao.TimeEntryDao
import com.vardiya.android.data.local.entity.OvertimeSnapshotEntity
import com.vardiya.android.data.local.entity.PayProfileEntity
import com.vardiya.android.data.local.entity.ReminderEntity
import com.vardiya.android.data.local.entity.ShiftEntity
import com.vardiya.android.data.local.entity.TimeEntryEntity

@Database(
    entities = [
        ShiftEntity::class,
        TimeEntryEntity::class,
        PayProfileEntity::class,
        OvertimeSnapshotEntity::class,
        ReminderEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class VardiyaDatabase : RoomDatabase() {
    abstract fun shiftDao(): ShiftDao
    abstract fun timeEntryDao(): TimeEntryDao
    abstract fun payProfileDao(): PayProfileDao
    abstract fun overtimeSnapshotDao(): OvertimeSnapshotDao
    abstract fun reminderDao(): ReminderDao

    companion object {
        fun create(context: Context): VardiyaDatabase {
            return Room.databaseBuilder(
                context,
                VardiyaDatabase::class.java,
                "vardiya_android.db"
            ).build()
        }
    }
}
