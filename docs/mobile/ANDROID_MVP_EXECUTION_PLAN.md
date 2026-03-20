# Android MVP Execution Plan

## Faz 0: Repo ve Dokümantasyon
- `docs/` kökü oluştur
- README’de Android ve mobile docs linklerini aç
- `yapilacak.md` dosyasını kısa takip listesine indir
- `apps/android` Gradle/Compose iskeletini ekle

## Faz 1: Çalışan Offline MVP
### Hedef
- Kullanıcı hesap açmadan vardiya girebilsin
- Haftalık ve aylık mesaiyi görsün
- Tahmini ücret hesaplasın

### Teslimatlar
- Onboarding
- Shift CRUD
- Pay profile ayarları
- Planned mesai raporu
- Reminder scheduling

### Exit Criteria
- Uygulama ilk açılışta onboarding gösteriyor
- Yeni vardiya eklenebiliyor
- Haftalık ve aylık rapor doluyor
- 45 saat üzeri mesai ayrışıyor
- Reminder açılınca bildirim izni doğru anda soruluyor

## Faz 2: Pro Katmanı
### Hedef
- Sürekli değer taşıyan ücretli katmanı açmak

### Teslimatlar
- Paywall
- Play Billing ürünü bağlama
- ACTUAL mode check-in/out
- Export iskeleti
- Çoklu profil veri modeli

### Exit Criteria
- Free kullanıcı ACTUAL mode seçince paywall görüyor
- Pro kullanıcı check-in/out ile actual süre üretebiliyor
- Product ID bağlandığında aynı paywall akışı satın alma tetikleyebiliyor

## Faz 3: Release Hazırlığı
- `bundleRelease` CI komutu
- Privacy policy
- KVKK aydınlatma metni
- Data safety form taslağı
- Internal testing release
- Crash/ANR takip zemini

## Faz 4: Backend Mobile Surface
- `/api/mobile/v1` auth sözleşmesi
- bearer-token refresh akışı
- mobile-safe time entries ve leave endpoints
- queued write stratejisi

## Şimdi / Sonra / Yapma
### Şimdi
- Android kişisel mod
- Offline data katmanı
- Planned hesap motoru
- Reminder
- Paywall iskeleti

### Sonra
- ACTUAL mode satın alma sonrası açma
- Export
- Çoklu profil
- Cloud backup
- B2B sync

### Yapma
- Exact alarm
- Reklam
- Cookie tabanlı mobile auth
- İlk sürümde manager-side vardiya yönetimi
- İlk sürümde iOS

## Test Checklist
- 45 saat altı
- 45 saat üstü
- Gece vardiyası
- Hafta sınırı aşan vardiya
- Open time entry ignore
- Notification permission timing
- Paywall açılışı
- Release bundle üretimi
