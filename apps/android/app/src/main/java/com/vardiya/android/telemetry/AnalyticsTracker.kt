package com.vardiya.android.telemetry

interface AnalyticsTracker {
    fun track(event: String, properties: Map<String, String> = emptyMap())
}
