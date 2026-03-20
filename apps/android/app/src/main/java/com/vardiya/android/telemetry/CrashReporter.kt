package com.vardiya.android.telemetry

interface CrashReporter {
    fun recordHandledException(throwable: Throwable)
}
