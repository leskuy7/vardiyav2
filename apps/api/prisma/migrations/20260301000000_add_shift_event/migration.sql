-- CreateEnum
CREATE TYPE "ShiftEventAction" AS ENUM ('CREATED', 'UPDATED', 'CANCELLED', 'ACKNOWLEDGED', 'DECLINED', 'SWAPPED');

-- CreateTable
CREATE TABLE "ShiftEvent" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "ShiftEventAction" NOT NULL,
    "previousStatus" "ShiftStatus",
    "newStatus" "ShiftStatus",
    "reason" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftEvent_shiftId_idx" ON "ShiftEvent"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftEvent_createdAt_idx" ON "ShiftEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "ShiftEvent" ADD CONSTRAINT "ShiftEvent_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
