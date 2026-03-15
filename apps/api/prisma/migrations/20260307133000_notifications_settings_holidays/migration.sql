CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "org_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "maxWeeklyHours" INTEGER NOT NULL DEFAULT 45,
    "overtimeMultiplier" DECIMAL(65,30) NOT NULL DEFAULT 1.5,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "workDays" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
    "shiftMinDuration" INTEGER NOT NULL DEFAULT 60,
    "shiftMaxDuration" INTEGER NOT NULL DEFAULT 720,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public_holidays" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "org_settings_organizationId_key" ON "org_settings"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "public_holidays_date_key" ON "public_holidays"("date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_userId_fkey'
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_settings_organizationId_fkey'
  ) THEN
    ALTER TABLE "org_settings"
      ADD CONSTRAINT "org_settings_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
