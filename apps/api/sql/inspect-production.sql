-- Production DB inspection helpers for Prisma
-- Use in Railway Postgres (Query tab or psql) to understand the current schema.

-- 1) Inspect Employee columns (checks for organizationId etc.)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Employee'
ORDER BY ordinal_position;

-- 2) Check if key multi-tenant tables exist
SELECT
  'organizations' AS table_name,
  to_regclass('public.organizations') IS NOT NULL AS exists;

SELECT
  'business_types' AS table_name,
  to_regclass('public.business_types') IS NOT NULL AS exists;

SELECT
  'business_templates' AS table_name,
  to_regclass('public.business_templates') IS NOT NULL AS exists;

SELECT
  'org_suggestions' AS table_name,
  to_regclass('public.org_suggestions') IS NOT NULL AS exists;

SELECT
  'user_credential_vaults' AS table_name,
  to_regclass('public.user_credential_vaults') IS NOT NULL AS exists;

-- 3) List Prisma migrations that the DB thinks are applied
SELECT
  migration_name,
  finished_at,
  applied_steps_count
FROM "_prisma_migrations"
ORDER BY finished_at NULLS LAST, migration_name;

-- 4) Optional: quickly see row counts in important tables
SELECT 'Employee' AS table_name, COUNT(*) AS row_count FROM "Employee";
SELECT 'organizations' AS table_name, COUNT(*) AS row_count FROM "organizations";

