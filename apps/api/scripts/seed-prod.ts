import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
    const accounts = [
        { email: 'admin@test.local', name: 'Admin User', role: 'ADMIN' as const, position: 'Admin', department: 'Yönetim', hourlyRate: 120 },
        { email: 'manager@test.local', name: 'Manager User', role: 'MANAGER' as const, position: 'Manager', department: 'Ops', hourlyRate: 100 },
        { email: 'employee@test.local', name: 'Employee User', role: 'EMPLOYEE' as const, position: 'Barista', department: 'Ops', hourlyRate: 80 }
    ];

    for (const acc of accounts) {
        const user = await prisma.user.upsert({
            where: { email: acc.email },
            update: {},
            create: {
                email: acc.email,
                name: acc.name,
                passwordHash: await bcrypt.hash('Test12345!', 12),
                role: acc.role
            }
        });

        await prisma.employee.upsert({
            where: { userId: user.id },
            update: {},
            create: {
                userId: user.id,
                position: acc.position,
                department: acc.department,
                hourlyRate: acc.hourlyRate
            }
        });
    }

    console.log('Seed complete: 3 demo accounts ready.');
}

seed()
    .catch((e) => {
        console.error('Seed error:', e);
    })
    .finally(() => prisma.$disconnect());
