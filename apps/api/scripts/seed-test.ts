import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.timeEntry.deleteMany();
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

  const businessType = await prisma.businessType.upsert({
    where: { code: 'RESTAURANT' },
    update: { name: 'Kafe / Restoran' },
    create: { code: 'RESTAURANT', name: 'Kafe / Restoran' }
  });

  const organization = await prisma.organization.create({
    data: {
      name: 'Test Coffee Shop',
      businessTypeId: businessType.id,
      adminUserId: admin.id
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
    data: { userId: admin.id, organizationId: organization.id, position: 'Admin', department: 'Yönetim', hourlyRate: 120 }
  });

  const managerEmployee = await prisma.employee.create({
    data: { userId: manager.id, organizationId: organization.id, position: 'Kafe Müdürü', department: 'Yönetim', hourlyRate: 100 }
  });

  const employee = await prisma.employee.create({
    data: { userId: employeeUser.id, organizationId: organization.id, position: 'Barista', department: 'Bar', hourlyRate: 80 }
  });

  // Create 10 more diverse employees for the demo
  const sampleUsers = [
    { name: 'Ayşe Yılmaz', role: 'EMPLOYEE', pos: 'Barista', dep: 'Bar', rate: 85 },
    { name: 'Mehmet Demir', role: 'EMPLOYEE', pos: 'Kasiyer', dep: 'Kasa', rate: 80 },
    { name: 'Fatma Kaya', role: 'EMPLOYEE', pos: 'Aşçı', dep: 'Mutfak', rate: 100 },
    { name: 'Ali Çelik', role: 'EMPLOYEE', pos: 'Garson', dep: 'Servis', rate: 75 },
    { name: 'Zeynep Şahin', role: 'EMPLOYEE', pos: 'Garson', dep: 'Servis', rate: 75 },
    { name: 'Ahmet Yıldız', role: 'EMPLOYEE', pos: 'Müdür Yardımcısı', dep: 'Yönetim', rate: 70 },
    { name: 'Elif Doğan', role: 'EMPLOYEE', pos: 'Barista', dep: 'Bar', rate: 85 },
    { name: 'Burak Arslan', role: 'EMPLOYEE', pos: 'Hazırlık', dep: 'Mutfak', rate: 70 },
    { name: 'Ceren Kılıç', role: 'EMPLOYEE', pos: 'Kasiyer', dep: 'Kasa', rate: 80 },
    { name: 'Oğuzhan Tekin', role: 'EMPLOYEE', pos: 'Şef', dep: 'Mutfak', rate: 130 }
  ];

  const createdEmployees = [];
  for (let i = 0; i < sampleUsers.length; i++) {
    const u = sampleUsers[i];
    const user = await prisma.user.create({
      data: {
        email: `user${i + 1}@test.local`,
        name: u.name,
        passwordHash: await bcrypt.hash('Test12345!', 12),
        role: u.role as any
      }
    });
    const emp = await prisma.employee.create({
      data: { userId: user.id, organizationId: organization.id, position: u.pos, department: u.dep, hourlyRate: u.rate }
    });
    createdEmployees.push(emp);
  }

  // Combine all employees
  const allEmployees = [adminEmployee, managerEmployee, employee, ...createdEmployees];

  // Base dates for shifts (Current Week)
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const diffToMonday = today.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
  const startOfWeek = new Date(today.setDate(diffToMonday));
  startOfWeek.setHours(0, 0, 0, 0);

  // Helper to format Date for creating shifts
  const getShiftDate = (dayOffset: number, hours: number) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + dayOffset);
    d.setUTCHours(hours, 0, 0, 0); // use UTC to avoid timezone issues
    return d;
  };

  const shiftsData = [];

  // Monday
  shiftsData.push({ employeeId: allEmployees[2].id, startTime: getShiftDate(0, 8), endTime: getShiftDate(0, 16), status: 'PUBLISHED' as any });
  shiftsData.push({ employeeId: allEmployees[3].id, startTime: getShiftDate(0, 10), endTime: getShiftDate(0, 18), status: 'PUBLISHED' as any });
  shiftsData.push({ employeeId: allEmployees[4].id, startTime: getShiftDate(0, 14), endTime: getShiftDate(0, 22), status: 'PUBLISHED' as any });

  // Tuesday
  shiftsData.push({ employeeId: allEmployees[5].id, startTime: getShiftDate(1, 8), endTime: getShiftDate(1, 16), status: 'PUBLISHED' as any });
  shiftsData.push({ employeeId: allEmployees[6].id, startTime: getShiftDate(1, 9), endTime: getShiftDate(1, 17), status: 'PUBLISHED' as any });
  shiftsData.push({ employeeId: allEmployees[7].id, startTime: getShiftDate(1, 15), endTime: getShiftDate(1, 23), status: 'PUBLISHED' as any });

  // Wednesday
  shiftsData.push({ employeeId: allEmployees[2].id, startTime: getShiftDate(2, 8), endTime: getShiftDate(2, 16), status: 'PUBLISHED' as any });
  shiftsData.push({ employeeId: allEmployees[8].id, startTime: getShiftDate(2, 12), endTime: getShiftDate(2, 20), status: 'PUBLISHED' as any });
  shiftsData.push({ employeeId: allEmployees[9].id, startTime: getShiftDate(2, 16), endTime: getShiftDate(2, 23), status: 'PUBLISHED' as any });

  // Thursday
  shiftsData.push({ employeeId: allEmployees[3].id, startTime: getShiftDate(3, 8), endTime: getShiftDate(3, 16), status: 'PUBLISHED' as any });
  shiftsData.push({ employeeId: allEmployees[4].id, startTime: getShiftDate(3, 10), endTime: getShiftDate(3, 18), status: 'PUBLISHED' as any });
  shiftsData.push({ employeeId: allEmployees[10].id, startTime: getShiftDate(3, 16), endTime: getShiftDate(3, 23), status: 'PUBLISHED' as any });

  // Friday
  shiftsData.push({ employeeId: allEmployees[5].id, startTime: getShiftDate(4, 8), endTime: getShiftDate(4, 16), status: 'PUBLISHED' as any });
  shiftsData.push({ employeeId: allEmployees[6].id, startTime: getShiftDate(4, 14), endTime: getShiftDate(4, 23), status: 'PUBLISHED' as any, note: 'Yoğun gün' });
  shiftsData.push({ employeeId: allEmployees[11].id, startTime: getShiftDate(4, 18), endTime: getShiftDate(4, 24), status: 'PUBLISHED' as any });

  // Saturday (Weekend)
  shiftsData.push({ employeeId: allEmployees[7].id, startTime: getShiftDate(5, 9), endTime: getShiftDate(5, 17), status: 'PUBLISHED' as any });
  shiftsData.push({ employeeId: allEmployees[8].id, startTime: getShiftDate(5, 12), endTime: getShiftDate(5, 20), status: 'PUBLISHED' as any });
  shiftsData.push({ employeeId: allEmployees[9].id, startTime: getShiftDate(5, 16), endTime: getShiftDate(5, 24), status: 'PUBLISHED' as any });
  shiftsData.push({ employeeId: allEmployees[12].id, startTime: getShiftDate(5, 17), endTime: getShiftDate(5, 24), status: 'PUBLISHED' as any });

  await prisma.shift.createMany({ data: shiftsData });

  await prisma.availabilityBlock.createMany({
    data: [
      { employeeId: managerEmployee.id, type: 'PREFER_NOT', dayOfWeek: 1, startTime: '08:00', endTime: '17:00' },
      { employeeId: createdEmployees[0].id, type: 'UNAVAILABLE', dayOfWeek: 5, startTime: '00:00', endTime: '23:59' }, // Saturday off
      { employeeId: createdEmployees[1].id, type: 'PREFER_NOT', dayOfWeek: 0, startTime: '08:00', endTime: '12:00' }, // Sunday morning prefer not
      { employeeId: createdEmployees[3].id, type: 'UNAVAILABLE', dayOfWeek: 2, startTime: '18:00', endTime: '23:59' }, // Wed evening class
    ]
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

  await prisma.leaveBalance.createMany({
    data: allEmployees.map(emp => ({
      employeeId: emp.id,
      leaveCode: 'ANNUAL',
      periodYear: currentYear,
      accruedMinutes: 14 * workdayMinutes
    }))
  });

  await prisma.timeEntry.createMany({
    data: [
      {
        employeeId: allEmployees[2].id,
        checkInAt: getShiftDate(0, 8),
        checkOutAt: getShiftDate(0, 16),
        endAt: getShiftDate(0, 16),
        status: 'CLOSED',
        source: 'MANUAL',
      },
      {
        employeeId: allEmployees[3].id,
        checkInAt: getShiftDate(0, 10),
        checkOutAt: getShiftDate(0, 18),
        endAt: getShiftDate(0, 18),
        status: 'CLOSED',
        source: 'MANUAL',
      },
      {
        employeeId: allEmployees[5].id,
        checkInAt: getShiftDate(1, 8),
        checkOutAt: getShiftDate(1, 16),
        endAt: getShiftDate(1, 16),
        status: 'CLOSED',
        source: 'MANUAL',
      },
      {
        employeeId: allEmployees[6].id,
        checkInAt: getShiftDate(1, 9),
        checkOutAt: getShiftDate(1, 17),
        endAt: getShiftDate(1, 17),
        status: 'CLOSED',
        source: 'MANUAL',
      },
      {
        employeeId: allEmployees[7].id,
        checkInAt: getShiftDate(1, 15),
        status: 'OPEN',
        source: 'MANUAL',
      }
    ]
  });

  // Example leave requests
  const nextMonday = new Date(startOfWeek);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const nextTuesday = new Date(startOfWeek);
  nextTuesday.setDate(nextTuesday.getDate() + 8);
  const mondayCurrentWeek = new Date(startOfWeek);
  mondayCurrentWeek.setUTCHours(14, 0, 0, 0);
  const mondayCurrentWeekEnd = new Date(startOfWeek);
  mondayCurrentWeekEnd.setUTCHours(22, 0, 0, 0);

  await prisma.leaveRequest.create({
    data: {
      employeeId: createdEmployees[1].id,
      leaveCode: 'ANNUAL',
      startDate: mondayCurrentWeek,
      endDate: mondayCurrentWeek,
      startAt: mondayCurrentWeek,
      endAt: mondayCurrentWeekEnd,
      status: 'APPROVED',
      reason: 'Yoğun hafta öncesi planlı izin'
    }
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: createdEmployees[1].id,
      leaveCode: 'ANNUAL',
      startDate: nextMonday,
      endDate: nextTuesday,
      startAt: nextMonday,
      endAt: nextTuesday,
      status: 'PENDING',
      reason: 'Hafta sonu dönüşü için izin talebi'
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
