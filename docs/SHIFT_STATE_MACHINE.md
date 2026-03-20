# Shift State Machine

Bu belge repo içindeki mevcut vardiya durumlarını ve servis seviyesinde izin verilen temel geçişleri özetler.

## Durumlar
- `PROPOSED`
- `DRAFT`
- `PUBLISHED`
- `ACKNOWLEDGED`
- `DECLINED`
- `SWAPPED`
- `CANCELLED`

Kaynak: `apps/api/prisma/schema.prisma`

## Uygulanan Geçişler
- Oluşturma: yeni vardiya default olarak `PUBLISHED` açılabilir; servis tarafında `dto.status` verilirse desteklenen statüler kabul edilir.
- Çalışan onayı: `PUBLISHED` veya `PROPOSED` vardiya `ACKNOWLEDGED` olabilir.
- Çalışan reddi: `PUBLISHED` veya `PROPOSED` vardiya `DECLINED` olabilir.
- Yönetici iptali: aktif vardiya `CANCELLED` olabilir.
- Takas onayı: uygun vardiya swap akışı sonunda `SWAPPED` olur.
- İzin onayı: çakışan vardiyalar leave request onayıyla `CANCELLED` olur.

Kaynak: `apps/api/src/shifts/shifts.service.ts`, `apps/api/src/swap-requests/swap-requests.service.ts`, `apps/api/src/leave-requests/leave-requests.service.ts`

## Pratik Notlar
- Raporlar ve attendance hesapları `CANCELLED` vardiyaları planlı çalışma olarak saymaz.
- Attendance ve puantaj ekranlarında aktif plan statüleri ağırlıklı olarak `PROPOSED`, `DRAFT`, `PUBLISHED`, `ACKNOWLEDGED`, `SWAPPED` kümesi üzerinden ele alınır.
- Mobil v1 kişisel modunda bu state machine bire bir kullanılmaz; ancak B2B mobile fazında API ile aynı statüler korunmalıdır.
