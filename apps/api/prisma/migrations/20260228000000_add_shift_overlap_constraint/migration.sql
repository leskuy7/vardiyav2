-- Shift overlap'ı engelle (CANCELLED hariç)
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Shift"
ADD CONSTRAINT shift_no_overlap
EXCLUDE USING GIST (
  "employeeId" WITH =,
  tstzrange("startTime","endTime") WITH &&
)
WHERE ("status" <> 'CANCELLED');
