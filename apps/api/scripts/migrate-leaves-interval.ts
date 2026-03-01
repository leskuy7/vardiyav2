import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const IST_OFFSET_MINUTES = 180; // Europe/Istanbul

function istMidnightUtc(dateISO: string): Date {
    const midnightUtcMs = new Date(`${dateISO}T00:00:00.000Z`).getTime();
    return new Date(midnightUtcMs - IST_OFFSET_MINUTES * 60_000);
}

function addDays(isoDate: string, days: number) {
    const d = new Date(`${isoDate}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

async function main() {
    const leaves = await prisma.leaveRequest.findMany();
    for (const leave of leaves) {
        const startISO = leave.startDate.toISOString().slice(0, 10);
        const endISO = leave.endDate.toISOString().slice(0, 10);
        const startAt = istMidnightUtc(startISO);
        const endAt = istMidnightUtc(addDays(endISO, 1));

        await prisma.leaveRequest.update({
            where: { id: leave.id },
            data: { startAt, endAt, unit: "DAY" },
        });
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => prisma.$disconnect());
