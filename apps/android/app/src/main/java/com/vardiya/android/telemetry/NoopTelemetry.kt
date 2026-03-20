package com.vardiya.android.telemetry

object NoopAnalyticsTracker : AnalyticsTracker {
    override fun track(event: String, properties: Map<String, String>) = Unit
}

object NoopCrashReporter : CrashReporter {
    override fun recordHandledException(throwable: Throwable) = Unit
}
