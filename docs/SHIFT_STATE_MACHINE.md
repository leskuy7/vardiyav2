# Vardiya durum makinesi

## Durumlar (ShiftStatus)

| Durum | Açıklama |
|-------|----------|
| PROPOSED | Öneri / taslak |
| DRAFT | Taslak (henüz yayınlanmadı) |
| PUBLISHED | Yayında; çalışan onayı bekleniyor |
| ACKNOWLEDGED | Çalışan tarafından onaylandı |
| DECLINED | Çalışan tarafından reddedildi |
| SWAPPED | Takas ile başka çalışana devredildi |
| CANCELLED | İptal edildi |

## Rol bazlı aksiyonlar

### EMPLOYEE (çalışan)

- **Kendi vardiyası** üzerinde:
  - `PUBLISHED` veya `PROPOSED` → **Onayla** (acknowledge) → `ACKNOWLEDGED`
  - `PUBLISHED` veya `PROPOSED` → **Reddet** (decline, gerekçe zorunlu) → `DECLINED`
  - `ACKNOWLEDGED` → **Takas iste** (swap request oluşturur; yönetici onayı sonrası vardiya SWAPPED olur)

### MANAGER / ADMIN

- Vardiya **oluşturma**: Varsayılan durum `PUBLISHED` (veya DTO ile `PROPOSED` / `DRAFT`).
- Vardiya **güncelleme**: Tarih/saat/çalışan/not/durum değiştirilebilir (kendi departmanı / tümü).
- Vardiya **iptal**: `PATCH /shifts/:id/cancel` veya `DELETE /shifts/:id` → `CANCELLED`.
- **Takas onayı**: `POST /swap-requests/:id/approve` (hedef çalışan belirtilir) → orijinal vardiya `SWAPPED`, hedef için yeni vardiya `PUBLISHED`.
- **Takas reddi**: `POST /swap-requests/:id/reject` → swap talebi REJECTED.

## Geçiş özeti

- **Oluşturma:** Yönetici vardiya oluşturur → `PUBLISHED` (veya `PROPOSED` / `DRAFT`).
- **Onay:** Çalışan onaylar → `ACKNOWLEDGED`.
- **Red:** Çalışan reddeder (gerekçe ile) → `DECLINED`.
- **İptal:** Yönetici iptal eder → `CANCELLED`.
- **Takas:** Çalışan takas talebi açar, yönetici onaylar → orijinal vardiya `SWAPPED`, hedefe yeni vardiya `PUBLISHED`.

## API uç noktaları

| Aksiyon | Method | Endpoint | Rol |
|---------|--------|----------|-----|
| Onayla | POST | `/shifts/:id/acknowledge` | EMPLOYEE |
| Reddet | POST | `/shifts/:id/decline` (body: `{ reason }`) | EMPLOYEE |
| İptal | PATCH | `/shifts/:id/cancel` | ADMIN, MANAGER |
| Takas iste | POST | `/swap-requests` (body: `{ shiftId, targetEmployeeId? }`) | EMPLOYEE |
| Takas onayla | POST | `/swap-requests/:id/approve` (body: `{ targetEmployeeId? }`) | ADMIN, MANAGER |
| Takas reddet | POST | `/swap-requests/:id/reject` | ADMIN, MANAGER, EMPLOYEE (hedef ise) |

## Denetim (ShiftEvent)

Vardiya üzerinde yapılan kritik aksiyonlar `ShiftEvent` tablosuna yazılır: CREATED, UPDATED, CANCELLED, ACKNOWLEDGED, DECLINED, SWAPPED. Her kayıtta `actorUserId`, `previousStatus`, `newStatus` ve isteğe bağlı `reason` saklanır.
