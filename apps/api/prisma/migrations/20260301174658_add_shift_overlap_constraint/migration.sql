-- Create extension for multiple column gist support
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Shift overlap check (except cancelled/inactive shifts)
ALTER TABLE "Shift"
  ADD CONSTRAINT shift_employee_timerange_no_overlap
  EXCLUDE USING gist (
    "employeeId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE ("isActive" = true);

-- LeaveRequest overlap check (pending and approved)
ALTER TABLE "leave_requests"
  ADD CONSTRAINT leave_emp_timerange_no_overlap
  EXCLUDE USING gist (
    "employeeId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'APPROVED'));

-- TimeEntry overlap check (open/closed but not void)
CREATE INDEX IF NOT EXISTS time_entries_employee_closed_range_gist
ON "time_entries" USING gist ("employeeId", tstzrange("checkInAt", "checkOutAt", '[)'))
WHERE ("status" = 'CLOSED' AND "checkOutAt" IS NOT NULL);