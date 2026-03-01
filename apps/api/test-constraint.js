const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();
    try {
        // get some employee
        const emp = await prisma.employee.findFirst();
        if (!emp) {
            console.log("No employee found.");
            return;
        }

        const t1 = new Date("2028-01-01T08:00:00Z");
        const t2 = new Date("2028-01-01T16:00:00Z");

        // Create first shift
        const shift1 = await prisma.shift.create({
            data: {
                employeeId: emp.id,
                startTime: t1,
                endTime: t2,
                status: "PUBLISHED"
            }
        });
        console.log("Created shift1:", shift1.id);

        // Try creating overlapping shift
        try {
            const shift2 = await prisma.shift.create({
                data: {
                    employeeId: emp.id,
                    startTime: new Date("2028-01-01T10:00:00Z"),
                    endTime: new Date("2028-01-01T18:00:00Z"),
                    status: "PUBLISHED"
                }
            });
            console.log("FAIL: managed to create overlapping shift:", shift2.id);
        } catch (err) {
            console.log("SUCCESS: Caught exception on overlap:", err.message);
        }

        // Cleanup
        await prisma.shift.delete({ where: { id: shift1.id } });
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
