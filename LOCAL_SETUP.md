# Local Ortamda Çalıştırma (Tek Dosyada Özet)

Proje kökü: `vardiyav2`. API: `apps/api`, Web: `apps/web`.

---

## 1. Gereksinimler

- Node 20+
- (A seçeneği için) Yerel PostgreSQL; (B için) Railway’da **production dışı** bir Postgres

---

## 2. Veritabanı (sadece birini yap)

### A) Yerel Postgres

1. Postgres’te `vardiya` veritabanı oluştur.
2. `apps/api/.env.local` oluştur:

```env
DATABASE_URL=postgresql://postgres:SIFRE@localhost:5432/vardiya
JWT_ACCESS_SECRET=dev-access
JWT_REFRESH_SECRET=dev-refresh
WEB_ORIGIN=http://localhost:3000
CSRF_ORIGIN=http://localhost:3000
```

(SIFRE yerine kendi şifreni yaz.)

### B) Railway dev Postgres (production değil)

- Railway’da **ayrı** bir Postgres oluştur; o servisin `DATABASE_URL`’ini al.
- `apps/api/.env.local` içine sadece bu URL ve yukarıdaki diğer satırları yaz. Production URL kullanma.

---

## 3. Web tarafı env

`apps/web/.env.local` oluştur:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
CSP_REPORT_TOKEN=dev-token
```

---

## 4. Migration ve (isteğe bağlı) seed

Proje kökünde:

```bash
cd apps/api
npx prisma migrate dev --name init_local
npx prisma generate
npm run seed:test
cd ../..
```

---

## 5. Uygulamayı başlat

Proje kökünde:

```bash
npm run dev
```

- API: http://localhost:4000  
- Web: http://localhost:3000  

Tarayıcıda http://localhost:3000 açıp giriş yap.

---

## Tek komut (zaten migration/seed yaptıysan)

Sadece çalıştırmak için:

```bash
npm run dev
```

Özet: Env’leri bir kere kur, sonra hep `npm run dev` yeter.
