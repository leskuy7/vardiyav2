package com.vardiya.android.ui

import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Currency
import java.util.Locale

val TurkeyZoneId: ZoneId = ZoneId.of("Europe/Istanbul")

fun currentWeekStart(): LocalDate {
    val today = LocalDate.now(TurkeyZoneId)
    return today.minusDays((today.dayOfWeek.value - 1).toLong())
}

fun formatDateTime(millis: Long): String {
    val formatter = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm", Locale("tr", "TR"))
    return formatter.format(Instant.ofEpochMilli(millis).atZone(TurkeyZoneId))
}

fun formatWeekLabel(weekStart: LocalDate): String {
    val formatter = DateTimeFormatter.ofPattern("dd MMM", Locale("tr", "TR"))
    return "${formatter.format(weekStart)} - ${formatter.format(weekStart.plusDays(6))}"
}

fun formatDurationMinutes(totalMinutes: Int): String {
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60
    return "${hours}s ${minutes}d"
}

fun formatCurrency(amount: Double, currencyCode: String): String {
    val formatter = NumberFormat.getCurrencyInstance(Locale("tr", "TR"))
    formatter.currency = Currency.getInstance(currencyCode)
    return formatter.format(amount)
}

fun parseLocalDate(dateText: String): LocalDate? = runCatching {
    LocalDate.parse(dateText, DateTimeFormatter.ISO_LOCAL_DATE)
}.getOrNull()

fun parseLocalTime(timeText: String): LocalTime? = runCatching {
    LocalTime.parse(timeText, DateTimeFormatter.ofPattern("HH:mm"))
}.getOrNull()

fun toEpochMillis(date: LocalDate, time: LocalTime): Long {
    return LocalDateTime.of(date, time).atZone(TurkeyZoneId).toInstant().toEpochMilli()
}
