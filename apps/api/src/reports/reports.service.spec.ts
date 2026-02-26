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
});
