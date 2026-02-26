# Vardiya v2

Production-ready hedefli vardiya planlama sistemi (monorepo).

## Tree

```text
.
├─ apps/
│  ├─ api/                # NestJS + Prisma + PostgreSQL
│  │  ├─ prisma/schema.prisma
│  │  ├─ src/
│  │  │  ├─ auth/
│  │  │  ├─ employees/
│  │  │  ├─ shifts/
│  │  │  ├─ availability/
│  │  │  ├─ schedule/
│  │  │  ├─ reports/
│  │  │  ├─ health/
│  │  │  └─ common/
│  │  ├─ test/app.e2e-spec.ts
│  │  └─ scripts/seed-test.ts
│  └─ web/                # Next.js App Router + React Query + Mantine + DnD-kit
│     ├─ src/app/
│     ├─ src/components/schedule/
│     ├─ src/hooks/
│     ├─ src/lib/
│     └─ tests/auth-schedule.e2e.spec.ts
├─ .github/workflows/ci.yml
├─ docker-compose.yml
└─ package.json
```

## Env

### API (`apps/api/.env`)

`apps/api/.env.example` içeriğini baz alın:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `WEB_ORIGIN`
- `CSRF_ORIGINS` (virgülle ayrılmış origin listesi)

### Web (`apps/web/.env`)

- `NEXT_PUBLIC_API_URL` (public olması gereken tek değer)

## Local Development

```bash
npm install
npm run -w @vardiya/api prisma:generate
npm run -w @vardiya/api prisma:push
npm run -w @vardiya/api seed:test
npm run dev
```

Not:

- `npm start` artık local geliştirme için `npm run dev` çalıştırır.
- Production başlatma için `npm run start:api` ve `npm run start:web` (build sonrası) kullanın.
- Windows'ta tek tıkla açmak için kökteki `start-local.bat` dosyasını çalıştırabilirsiniz.
- `npm run dev` başlamadan önce otomatik olarak `3000/4000` portlarını temizler ve `apps/web/.next` klasörünü sıfırlar (EPERM/port conflict sorunlarını azaltır).
- Ayrı terminalle çalıştırmak isterseniz:

```bash
# Terminal 1 (API)
npm run -w @vardiya/api dev

# Terminal 2 (Web)
npm run -w @vardiya/web dev
```

## Docker Compose

```bash
docker compose up --build
```

## Güvenlik Kararları

- Access token kısa ömürlü JWT (varsayılan `15m`), refresh token uzun ömürlü (`7d`).
- Refresh token rotation + DB'de hash (`refreshTokenHash`) saklama.
- Refresh token yalnızca `httpOnly` cookie ile taşınır (`Secure` prod, `SameSite` prod `none`).
- CSRF mitigasyonu: state-changing isteklerde `Origin/Referer` doğrulaması (`CsrfGuard`).
- Env fail-fast: kritik env eksikse API açılmaz.
- Rate limiting: `@nestjs/throttler` aktif.

## API Sözleşmesi

### Auth

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Employees (ADMIN/MANAGER)

- `GET /api/employees?active=bool`
- `GET /api/employees/:id`
- `POST /api/employees`
- `PATCH /api/employees/:id`
- `DELETE /api/employees/:id`

### Shifts

- `GET /api/shifts?employeeId&start&end&status`
- `GET /api/shifts/:id`
- `POST /api/shifts`
- `PATCH /api/shifts/:id`
- `DELETE /api/shifts/:id`
- `POST /api/shifts/:id/acknowledge`
- `POST /api/shifts/copy-week`
- `POST /api/shifts/bulk`

### Availability

- `GET /api/availability?employeeId&dayOfWeek`
- `POST /api/availability`
- `DELETE /api/availability/:id`

### Schedule

- `GET /api/schedule/week?start=YYYY-MM-DD`
- `GET /api/schedule/print?start=YYYY-MM-DD`

### Reports

- `GET /api/reports/weekly-hours?weekStart=YYYY-MM-DD`

### Health

- `GET /api/health`

## OpenAPI

- UI: `/api/docs`
- JSON export: `/api/docs-json`

## Testler

### Backend unit

```bash
npm run -w @vardiya/api test
```

### Backend e2e

PostgreSQL çalışır durumda olmalı.

```bash
npm run -w @vardiya/api prisma:push
npm run -w @vardiya/api test:e2e
```

### Frontend Playwright

```bash
npm run -w @vardiya/web test
```

## CI/CD

`/.github/workflows/ci.yml`:

- API job: lint + prisma push + build + unit + e2e (Postgres service container)
- Web job: build + Playwright (API+Web start edilip test edilir)

## Deploy Notları

- **Railway/Render/Fly (API):** `apps/api/Dockerfile` ile deploy
- **Vercel (Web):** `apps/web` deploy, `NEXT_PUBLIC_API_URL` set edilerek
- **DB:** PostgreSQL (UTC `timestamptz`)

## Kabul Kriteri Durumu (Özet)

- `/api` prefix: ✅
- Standart hata formatı: ✅
- Auth + rotation + hash refresh: ✅
- Cookie + secure/samesite: ✅
- CSRF mitigasyonu (Origin/Referer): ✅
- Fallback secret yok/fail-fast env: ✅
- Rate limiting: ✅
- Availability kuralları + override warning: ✅
- Copy-week/bulk transaction: ✅
- App Router + memory token + single-flight refresh: ✅
- Schedule grid + drag/drop + modal + warning gösterimi: ✅
- Role routing (`/schedule,/employees,/reports` ve `/my-shifts`): ✅
