UPDATE "business_types"
SET "name" = 'Kafe / Restoran'
WHERE "code" = 'RESTAURANT';

WITH restaurant_type AS (
  SELECT id
  FROM "business_types"
  WHERE "code" = 'RESTAURANT'
)
DELETE FROM "business_templates"
WHERE "businessTypeId" IN (SELECT id FROM restaurant_type)
  AND "kind" = 'DEPARTMENT'
  AND "value" NOT IN ('Bar', 'Servis', 'Mutfak', 'Kasa', 'Yönetim');

WITH restaurant_type AS (
  SELECT id
  FROM "business_types"
  WHERE "code" = 'RESTAURANT'
)
INSERT INTO "business_templates" ("id", "businessTypeId", "kind", "value")
SELECT gen_random_uuid(), restaurant_type.id, 'DEPARTMENT'::"SuggestionKind", department_name
FROM restaurant_type
CROSS JOIN (VALUES ('Bar'), ('Servis'), ('Mutfak'), ('Kasa'), ('Yönetim')) AS departments(department_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM "business_templates" bt
  WHERE bt."businessTypeId" = restaurant_type.id
    AND bt."kind" = 'DEPARTMENT'
    AND bt."value" = department_name
);

WITH restaurant_type AS (
  SELECT id
  FROM "business_types"
  WHERE "code" = 'RESTAURANT'
)
DELETE FROM "business_templates"
WHERE "businessTypeId" IN (SELECT id FROM restaurant_type)
  AND "kind" = 'POSITION'
  AND "value" NOT IN ('Barista', 'Garson', 'Kasiyer', 'Aşçı', 'Şef', 'Müdür');

WITH restaurant_type AS (
  SELECT id
  FROM "business_types"
  WHERE "code" = 'RESTAURANT'
)
INSERT INTO "business_templates" ("id", "businessTypeId", "kind", "value")
SELECT gen_random_uuid(), restaurant_type.id, 'POSITION'::"SuggestionKind", position_name
FROM restaurant_type
CROSS JOIN (VALUES ('Barista'), ('Garson'), ('Kasiyer'), ('Aşçı'), ('Şef'), ('Müdür')) AS positions(position_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM "business_templates" bt
  WHERE bt."businessTypeId" = restaurant_type.id
    AND bt."kind" = 'POSITION'
    AND bt."value" = position_name
);
