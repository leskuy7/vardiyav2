ALTER TABLE "org_settings"
ADD COLUMN IF NOT EXISTS "printFormConfig" JSONB NOT NULL DEFAULT '{}'::jsonb;
