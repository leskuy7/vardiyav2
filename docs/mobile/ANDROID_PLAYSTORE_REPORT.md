# Android “Vardiya / Mesai Hesaplayıcı” Canonical Report

## Amaç
- Bu belge Android hattı için tek canonical strateji kaynağıdır.
- Play Store’a çıkacak kişisel/offline-first uygulamanın ürün, mimari, monetizasyon ve yayın kararlarını sabitler.
- Uzun vadede B2B mobile entegrasyonunun backend ile nasıl birleşeceğini tarif eder.

## Ürün Tezi
- İlk yayın Android-only olacak.
- İlk sürüm hesapsız, kişisel, offline-first çalışacak.
- Kullanıcı ana problemi: vardiya saatlerini hızlı kaydetmek, haftalık mesaiyi görmek, 45 saat üstünü net ayırmak, tahmini ücreti anlamak.
- Türkiye-first defaultlar korunacak:
  - `TRY`
  - `45 saat`
  - `1.5 mesai çarpanı`
  - `Europe/Istanbul`

## Repo Bağlamı
- Mevcut repo zaten vardiya ve mesai domain’ini taşıyor:
  - `apps/api` NestJS + Prisma + PostgreSQL
  - `apps/web` Next.js operasyon paneli
- Backend’de mesai omurgası zaten var:
  - `OvertimeService` haftalık toplamı `PLANNED` ve `ACTUAL` olarak hesaplıyor
  - `time-entries` check-in / check-out akışını destekliyor
  - `leave-requests` ve `reports` modülleri mobil ikinci faz için doğal aday
- Android v1 bu mantığı bire bir Kotlin use case katmanına port eder; backend ilk sürümde zorunlu değildir.

## Neden Native Android
- Play Store dağıtımı için en güvenli yol native Android.
- Offline-first veri modeli Room + DataStore ile sürdürülebilir.
- Bildirim, arka plan iş, AAB üretimi ve release hazırlığı native tarafta daha kontrollü.
- PWA/hybrid ikinci planda tutulur; iOS bu hattın parçası değildir.

## Teknik Kararlar
### Uygulama Yapısı
- Konum: `apps/android`
- Başlangıç yapısı: tek `app` modülü
- Dil: Kotlin
- UI: Jetpack Compose
- Lokal veri: Room
- Ayarlar: DataStore
- Arka plan iş: WorkManager
- Satın alma omurgası: Play Billing iskeleti
- Telemetri omurgası: Crashlytics / Analytics için swap yapılabilir abstraction

### SDK ve Paketleme
- `compileSdk = 35`
- `targetSdk = 35`
- `minSdk = 26`
- Dağıtım formatı: `AAB`

### Veri Modeli
- `ShiftEntity`
- `TimeEntryEntity`
- `PayProfileEntity`
- `OvertimeSnapshotEntity`
- `ReminderEntity`

### Hesaplama Modeli
- Varsayılan mod: `PLANNED`
- Pro mod: `ACTUAL`
- Haftalık sınır: `maxWeeklyHours * 60`
- Ücret hesabı:
  - normal süre = `min(total, maxWeeklyMinutes)`
  - mesai = `max(total - maxWeeklyMinutes, 0)`
  - ücret = `regularMinutes * ratePerMinute + overtimeMinutes * ratePerMinute * overtimeMultiplier`
- Gece vardiyası ve hafta sınırı aşan kayıtlar yalnızca kesişen zaman kadar hesaba katılır.

## MVP Kapsamı
- Kişisel mod
- Vardiya ekle / sil
- Haftalık rapor
- Aylık özet
- Saatlik ücret ayarları
- Haftalık limit
- Mesai çarpanı
- Para birimi
- Hatırlatma aç / kapat
- Bildirim izni yalnızca ilk reminder anında istenir

## Monetizasyon
### Ücretsiz
- Tek profil
- Planned mesai hesabı
- Temel haftalık / aylık rapor

### Pro
- PDF / CSV export
- Çoklu profil
- ACTUAL mode check-in/out
- Gelişmiş reminder

### Bilinçli Olarak Dışarıda
- Reklam
- Zorunlu hesap
- Bulut sync
- Manager-side vardiya planlama

## Play Store Hazırlığı
- Privacy policy zorunlu
- KVKK aydınlatma metni hazırlanmalı
- Play Data safety formu doldurulmalı
- Internal testing track açılmalı
- Play App Signing kullanılmalı
- Android Vitals ve crash-free oranı izlenmeli

## İzin Politikası
- MVP tek hassas izin: `POST_NOTIFICATIONS`
- Konum, SMS, rehber, call log, all-files-access yok
- Exact alarm yok
- Reminder akışı WorkManager ile kurulacak

## Release ve Operasyon
- Yerel komut hedefi:
  - `testDebugUnitTest`
  - `lintDebug`
  - `bundleRelease`
- CI genişlemesi Android job ile yapılmalı.
- `google-services.json` repo içine girmez; telemetry swap noktası korunur.

## Backend İkinci Faz
- Mevcut web auth/cookie+CSRF akışı mobile için uygun değildir.
- Mobile ikinci fazda yeni yüzey açılacaktır:
  - `/api/mobile/v1/auth/login`
  - `/api/mobile/v1/auth/refresh`
  - `/api/mobile/v1/auth/logout`
  - `/api/mobile/v1/me`
  - `/api/mobile/v1/shifts/week`
  - `/api/mobile/v1/overtime/my`
  - `/api/mobile/v1/time-entries`
  - `/api/mobile/v1/time-entries/check-in`
  - `/api/mobile/v1/time-entries/:id/check-out`
  - `/api/mobile/v1/leave-requests`
- Mobile auth bearer-token tabanlı olacak; cookie zorunluluğu ve web `CsrfGuard` bağımlılığı olmayacak.

## Sync Stratejisi
- V1: sync yok, cihaz source of truth
- Faz 2: server-authoritative shift verisi + queued writes
- Conflict yaklaşımı:
  - shift okumaları server’dan gelir
  - time entry ve leave request yazımları client queue ile taşınır
  - idempotent replay + `last-write-wins`

## 7 Günlük Doğrulama Planı
1. Hedef kullanıcı görüşmeleri
2. Overtime hesap senaryoları
3. Compose prototip akışı
4. Reminder ve notification izni testi
5. Play checklist
6. Paywall ve Pro değer testi
7. Internal test pilotu

## Bu Belgenin Kullanımı
- Ürün kararı gerektiğinde önce bu belge güncellenir.
- Kısa yürütme adımları `docs/mobile/ANDROID_MVP_EXECUTION_PLAN.md` içinde tutulur.
- Kök `yapilacak.md` yalnızca kısa takip listesidir; canonical strateji kaynağı değildir.
