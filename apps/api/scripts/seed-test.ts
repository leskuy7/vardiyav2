import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.shift.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.local',
      name: 'Admin User',
      passwordHash: await bcrypt.hash('Test12345!', 12),
      role: 'ADMIN'
    }
  });

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

  const adminEmployee = await prisma.employee.create({
    data: { userId: admin.id, position: 'Admin', department: 'Yönetim', hourlyRate: 120 }
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

  // Create standard leave types
  const annualLeave = await prisma.leaveType.create({
    data: { code: 'ANNUAL', name: 'Yıllık İzin', isPaid: true, annualEntitlementDays: 14 }
  });

  await prisma.leaveType.create({
    data: { code: 'SICK', name: 'Hastalık İzni', isPaid: true, requiresDocument: true }
  });

  await prisma.leaveType.create({
    data: { code: 'UNPAID', name: 'Ücretsiz İzin', isPaid: false }
  });

  await prisma.leaveType.create({
    data: { code: 'OTHER', name: 'Diğer', isPaid: true }
  });

  // Assign leave balance to employee for the current year
  const currentYear = new Date().getFullYear();
  const workdayMinutes = 8 * 60; // 480 minutes 

  await prisma.leaveBalance.create({
    data: {
      employeeId: employee.id,
      leaveCode: 'ANNUAL',
      periodYear: currentYear,
      accruedMinutes: 14 * workdayMinutes
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
