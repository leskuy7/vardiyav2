# Vardiya Android

Native Android uygulama iskeleti.

## Stack
- Kotlin
- Jetpack Compose
- Room
- DataStore
- WorkManager
- Play Billing iskeleti

## Amaç
- İlk sürümde hesapsız, kişisel, offline-first vardiya / mesai hesabı
- Play Store için `targetSdk 35`
- Çıktı formatı `AAB`

## Komutlar
```bash
./gradlew testDebugUnitTest
./gradlew lintDebug
./gradlew bundleRelease
```

## Notlar
- `google-services.json` bu repoda tutulmaz.
- Billing şu an stub akışla bağlıdır; gerçek ürün kimliği ikinci adımda bağlanmalıdır.
- Backend entegrasyonu ilk sürümde zorunlu değildir.
