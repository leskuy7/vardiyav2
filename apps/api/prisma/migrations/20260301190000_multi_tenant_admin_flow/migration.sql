-- AlterEnum: Add ROOT to UserRole (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'ROOT'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'ROOT';
  END IF;
END
$$;

CREATE TYPE "SuggestionKind" AS ENUM ('DEPARTMENT', 'POSITION');

CREATE TABLE "business_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "business_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "business_types_code_key" ON "business_types"("code");

CREATE TABLE "business_templates" (
    "id" TEXT NOT NULL,
    "businessTypeId" TEXT NOT NULL,
    "kind" "SuggestionKind" NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "business_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "business_templates_businessTypeId_kind_value_key" ON "business_templates"("businessTypeId", "kind", "value");
ALTER TABLE "business_templates" ADD CONSTRAINT "business_templates_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "business_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessTypeId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organizations_adminUserId_key" ON "organizations"("adminUserId");
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "business_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "org_suggestions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "SuggestionKind" NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "org_suggestions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "org_suggestions_organizationId_kind_value_key" ON "org_suggestions"("organizationId", "kind", "value");
ALTER TABLE "org_suggestions" ADD CONSTRAINT "org_suggestions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_credential_vaults" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "seenByManagerAt" TIMESTAMP(3),
    CONSTRAINT "user_credential_vaults_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_credential_vaults_userId_key" ON "user_credential_vaults"("userId");

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Employee_organizationId_fkey'
  ) THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

INSERT INTO "business_types" ("id", "code", "name")
SELECT gen_random_uuid(), 'RESTAURANT', 'Restoran'
WHERE NOT EXISTS (SELECT 1 FROM "business_types" WHERE "code" = 'RESTAURANT');

INSERT INTO "business_types" ("id", "code", "name")
SELECT gen_random_uuid(), 'HOTEL', 'Otel'
WHERE NOT EXISTS (SELECT 1 FROM "business_types" WHERE "code" = 'HOTEL');

INSERT INTO "business_types" ("id", "code", "name")
SELECT gen_random_uuid(), 'FACTORY', 'Fabrika'
WHERE NOT EXISTS (SELECT 1 FROM "business_types" WHERE "code" = 'FACTORY');

INSERT INTO "business_types" ("id", "code", "name")
SELECT gen_random_uuid(), 'RETAIL', 'Perakende'
WHERE NOT EXISTS (SELECT 1 FROM "business_types" WHERE "code" = 'RETAIL');

INSERT INTO "business_types" ("id", "code", "name")
SELECT gen_random_uuid(), 'OFFICE', 'Ofis'
WHERE NOT EXISTS (SELECT 1 FROM "business_types" WHERE "code" = 'OFFICE');

INSERT INTO "business_templates" ("id", "businessTypeId", "kind", "value")
SELECT gen_random_uuid(), bt.id, 'DEPARTMENT'::"SuggestionKind", v
FROM "business_types" bt, (VALUES ('Mutfak'), ('Servis'), ('Yönetim'), ('Temizlik'), ('Bar')) AS t(v)
WHERE bt.code = 'RESTAURANT'
  AND NOT EXISTS (SELECT 1 FROM "business_templates" WHERE "businessTypeId" = bt.id AND "kind" = 'DEPARTMENT' AND "value" = v);

INSERT INTO "business_templates" ("id", "businessTypeId", "kind", "value")
SELECT gen_random_uuid(), bt.id, 'POSITION'::"SuggestionKind", v
FROM "business_types" bt, (VALUES ('Aşçı'), ('Garson'), ('Komi'), ('Barmen'), ('Müdür'), ('Kasiyer')) AS t(v)
WHERE bt.code = 'RESTAURANT'
  AND NOT EXISTS (SELECT 1 FROM "business_templates" WHERE "businessTypeId" = bt.id AND "kind" = 'POSITION' AND "value" = v);

INSERT INTO "business_templates" ("id", "businessTypeId", "kind", "value")
SELECT gen_random_uuid(), bt.id, 'DEPARTMENT'::"SuggestionKind", v
FROM "business_types" bt, (VALUES ('Resepsiyon'), ('Housekeeping'), ('Restoran'), ('Teknik')) AS t(v)
WHERE bt.code = 'HOTEL'
  AND NOT EXISTS (SELECT 1 FROM "business_templates" WHERE "businessTypeId" = bt.id AND "kind" = 'DEPARTMENT' AND "value" = v);

INSERT INTO "business_templates" ("id", "businessTypeId", "kind", "value")
SELECT gen_random_uuid(), bt.id, 'POSITION'::"SuggestionKind", v
FROM "business_types" bt, (VALUES ('Resepsiyonist'), ('Oda Görevlisi'), ('Garson'), ('Teknisyen')) AS t(v)
WHERE bt.code = 'HOTEL'
  AND NOT EXISTS (SELECT 1 FROM "business_templates" WHERE "businessTypeId" = bt.id AND "kind" = 'POSITION' AND "value" = v);
