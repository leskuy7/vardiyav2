# Vardiya Desktop

Electron tabanli masaustu kabuk uygulamasi.

Amac:
- mevcut `apps/web` arayuzunu masaustu pencerede acmak
- repo icindeki `api` ve `web` sureclerini otomatik baslatmak
- Windows odakli yerel kullanim saglamak

## Komutlar

```bash
npm run -w @vardiya/desktop dev
npm run -w @vardiya/desktop start
npm run -w @vardiya/desktop build
```

## Notlar

- `dev` modu `npm run dev:api` ve `npm run dev:web` sureclerini otomatik baslatir.
- `start` modu `npm run start:api` ve `npm run start:web` sureclerini otomatik baslatir.
- `start` kullanmadan once API ve Web icin build alinmis olmali.
- Varsayilan web adresi `http://localhost:3000`, API health adresi `http://localhost:4000/api/health` olarak beklenir.

Opsiyonel env:
- `VARDIYA_DESKTOP_URL`
- `VARDIYA_DESKTOP_API_HEALTH_URL`
- `VARDIYA_DESKTOP_MANAGED_SERVERS=false`
