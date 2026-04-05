import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('weekly saat ve maliyet toplamını hesaplar', async () => {
    const prisma = {
      shift: {
        findMany: jest.fn().mockResolvedValue([
          {
            employeeId: 'e1',
            startTime: new Date('2026-01-05T08:00:00.000Z'),
            endTime: new Date('2026-01-05T16:00:00.000Z'),
            employee: { hourlyRate: 100, maxWeeklyHours: 16, user: { name: 'Ali' } }
          },
          {
            employeeId: 'e1',
            startTime: new Date('2026-01-06T08:00:00.000Z'),
            endTime: new Date('2026-01-06T20:00:00.000Z'),
            employee: { hourlyRate: 100, maxWeeklyHours: 16, user: { name: 'Ali' } }
          }
        ])
      }
    } as unknown as ConstructorParameters<typeof ReportsService>[0];

    const service = new ReportsService(prisma);
    const report = await service.weeklyHours('2026-01-05');

    expect(report.employees).toHaveLength(1);
    expect(report.totals.hours).toBeCloseTo(20);
    expect(report.totals.overtimeHours).toBeCloseTo(4);
    expect(report.totals.cost).toBeCloseTo(2200);
  });

  it('MANAGER actor ile weeklyHours sadece kendi departmanının vardiyalarını filtreler', async () => {
    const shiftFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      employee: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', department: 'Sales' })
      },
      shift: { findMany: shiftFindMany }
    } as unknown as ConstructorParameters<typeof ReportsService>[0];

    const service = new ReportsService(prisma);
    await service.weeklyHours('2026-01-05', { role: 'MANAGER', employeeId: 'm1' });

    expect(prisma.employee.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'm1' } })
    );
    expect(shiftFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employee: { department: 'Sales' },
          status: { in: ['PROPOSED', 'PUBLISHED', 'ACKNOWLEDGED'] }
        })
      })
    );
  });

  it('attendanceSummary acik puantaji devamsizliktan ayirir ve onayli izni dislar', async () => {
    const prisma = {
      shift: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'shift-1',
            employeeId: 'e1',
            status: 'PUBLISHED',
            startTime: new Date('2026-01-05T08:00:00.000Z'),
            endTime: new Date('2026-01-05T16:00:00.000Z'),
            employee: { department: 'Servis', user: { name: 'Ali' } }
          },
          {
            id: 'shift-2',
            employeeId: 'e2',
            status: 'ACKNOWLEDGED',
            startTime: new Date('2026-01-06T08:00:00.000Z'),
            endTime: new Date('2026-01-06T16:00:00.000Z'),
            employee: { department: 'Bar', user: { name: 'Ayse' } }
          },
          {
            id: 'shift-3',
            employeeId: 'e3',
            status: 'PUBLISHED',
            startTime: new Date('2026-01-07T08:00:00.000Z'),
            endTime: new Date('2026-01-07T16:00:00.000Z'),
            employee: { department: 'Mutfak', user: { name: 'Mehmet' } }
          }
        ])
      },
      timeEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'entry-1',
            employeeId: 'e1',
            shiftId: 'shift-1',
            checkInAt: new Date('2026-01-05T08:05:00.000Z'),
            checkOutAt: new Date('2026-01-05T16:00:00.000Z'),
            endAt: new Date('2026-01-05T16:00:00.000Z'),
            status: 'CLOSED',
            source: 'MANUAL',
            employee: { department: 'Servis', user: { name: 'Ali' } },
            shift: {
              id: 'shift-1',
              startTime: new Date('2026-01-05T08:00:00.000Z'),
              endTime: new Date('2026-01-05T16:00:00.000Z'),
              status: 'PUBLISHED'
            }
          },
          {
            id: 'entry-2',
            employeeId: 'e4',
            shiftId: null,
            checkInAt: new Date('2026-01-06T09:00:00.000Z'),
            checkOutAt: null,
            endAt: null,
            status: 'OPEN',
            source: 'MANUAL',
            employee: { department: 'Servis', user: { name: 'Zeynep' } },
            shift: null
          }
        ])
      },
      leaveRequest: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'leave-1',
            employeeId: 'e3',
            leaveCode: 'ANNUAL',
            startAt: new Date('2026-01-07T07:00:00.000Z'),
            endAt: new Date('2026-01-07T18:00:00.000Z'),
            startDate: new Date('2026-01-07T00:00:00.000Z'),
            endDate: new Date('2026-01-07T00:00:00.000Z')
          }
        ])
      }
    } as unknown as ConstructorParameters<typeof ReportsService>[0];

    const service = new ReportsService(prisma);
    jest.useFakeTimers().setSystemTime(new Date('2026-01-08T10:00:00.000Z'));

    const report = await service.attendanceSummary('2026-01-05');

    expect(report.scheduledShiftCount).toBe(3);
    expect(report.timeEntryCount).toBe(2);
    expect(report.openEntries).toBe(1);
    expect(report.missingEntries).toBe(1);
    expect(report.absentShifts).toBe(1);
    expect(report.employeesWithoutCheckout).toBe(1);
    expect(report.absentShiftItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ shiftId: 'shift-2', employeeName: 'Ayse' })
      ])
    );
    expect(report.absentShiftItems).toHaveLength(1);
    expect(report.missingEntryItems).toHaveLength(1);

    jest.useRealTimers();
  });

  it('attendanceSummary ayni puantaj kaydini iki vardiya icin tekrar kullanmaz', async () => {
    const prisma = {
      shift: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'shift-1',
            employeeId: 'e1',
            status: 'PUBLISHED',
            startTime: new Date('2026-01-05T08:00:00.000Z'),
            endTime: new Date('2026-01-05T12:00:00.000Z'),
            employee: { department: 'Servis', user: { name: 'Ali' } }
          },
          {
            id: 'shift-2',
            employeeId: 'e1',
            status: 'PUBLISHED',
            startTime: new Date('2026-01-05T17:00:00.000Z'),
            endTime: new Date('2026-01-05T21:00:00.000Z'),
            employee: { department: 'Servis', user: { name: 'Ali' } }
          }
        ])
      },
      timeEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'entry-1',
            employeeId: 'e1',
            shiftId: null,
            checkInAt: new Date('2026-01-05T08:00:00.000Z'),
            checkOutAt: null,
            endAt: null,
            status: 'OPEN',
            source: 'MANUAL',
            employee: { department: 'Servis', user: { name: 'Ali' } },
            shift: null
          }
        ])
      },
      leaveRequest: {
        findMany: jest.fn().mockResolvedValue([])
      }
    } as unknown as ConstructorParameters<typeof ReportsService>[0];

    const service = new ReportsService(prisma);
    jest.useFakeTimers().setSystemTime(new Date('2026-01-05T18:00:00.000Z'));

    const report = await service.attendanceSummary('2026-01-05');

    expect(report.scheduledShiftCount).toBe(2);
    expect(report.timeEntryCount).toBe(1);
    expect(report.openEntries).toBe(1);
    expect(report.missingEntries).toBe(1);
    expect(report.absentShifts).toBe(0);
    expect(report.employeeSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employeeId: 'e1',
          matchedEntries: 1,
          missingEntries: 1
        })
      ])
    );

    jest.useRealTimers();
  });

  it('attendanceSummary hafta ile kesisen gece vardiyasini dahil eder', async () => {
    const prisma = {
      shift: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'shift-overnight',
            employeeId: 'e1',
            status: 'PUBLISHED',
            startTime: new Date('2026-01-04T23:00:00.000Z'),
            endTime: new Date('2026-01-05T07:00:00.000Z'),
            employee: { department: 'Bar', user: { name: 'Ayse' } }
          }
        ])
      },
      timeEntry: {
        findMany: jest.fn().mockResolvedValue([])
      },
      leaveRequest: {
        findMany: jest.fn().mockResolvedValue([])
      }
    } as unknown as ConstructorParameters<typeof ReportsService>[0];

    const service = new ReportsService(prisma);
    jest.useFakeTimers().setSystemTime(new Date('2026-01-05T10:00:00.000Z'));

    const report = await service.attendanceSummary('2026-01-05');

    expect(report.scheduledShiftCount).toBe(1);
    expect(report.missingEntries).toBe(1);
    expect(report.absentShifts).toBe(1);
    expect(report.absentShiftItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ shiftId: 'shift-overnight', employeeName: 'Ayse' })
      ])
    );

    jest.useRealTimers();
  });
});
