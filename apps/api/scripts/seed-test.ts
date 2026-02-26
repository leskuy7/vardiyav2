import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.shift.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  const manager = await prisma.user.create({
    data: {
      email: 'manager@test.local',
      name: 'Manager User',
      passwordHash: await bcrypt.hash('Test12345!', 12),
      role: 'MANAGER'
    }
  });

  const employeeUser = await prisma.user.create({
    data: {
      email: 'employee@test.local',
      name: 'Employee User',
      passwordHash: await bcrypt.hash('Test12345!', 12),
      role: 'EMPLOYEE'
    }
  });

  const managerEmployee = await prisma.employee.create({
    data: { userId: manager.id, position: 'Manager', department: 'Ops', hourlyRate: 100 }
  });

  const employee = await prisma.employee.create({
    data: { userId: employeeUser.id, position: 'Barista', department: 'Ops', hourlyRate: 80 }
  });

  await prisma.shift.create({
    data: {
      employeeId: employee.id,
      startTime: new Date('2026-01-05T08:00:00.000Z'),
      endTime: new Date('2026-01-05T16:00:00.000Z'),
      status: 'PUBLISHED'
    }
  });

  await prisma.availabilityBlock.create({
    data: {
      employeeId: managerEmployee.id,
      type: 'PREFER_NOT',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '17:00'
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
