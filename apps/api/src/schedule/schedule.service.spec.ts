import { ForbiddenException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  function createService() {
    const prisma: {
      shift: { findMany: jest.Mock };
    } = {
      shift: { findMany: jest.fn() }
    };

    const mockShiftsService = {
      buildComplianceWarnings: jest.fn().mockResolvedValue([])
    };

    return {
      service: new ScheduleService(
        prisma as unknown as ConstructorParameters<typeof ScheduleService>[0],
        mockShiftsService as unknown as ConstructorParameters<typeof ScheduleService>[1]
      ),
      prisma
    };
  }

  it('employee haftalık planı kendi employeeId kapsamına göre filtreler', async () => {
    const { service, prisma } = createService();
    prisma.shift.findMany.mockResolvedValue([]);

    await service.getWeek('2026-01-05', { role: 'EMPLOYEE', employeeId: 'emp-1' });

    expect(prisma.shift.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ employeeId: 'emp-1' })
      })
    );
  });

  it('employeeId eksikse Forbidden döner', async () => {
    const { service, prisma } = createService();
    prisma.shift.findMany.mockResolvedValue([]);

    await expect(service.getWeek('2026-01-05', { role: 'EMPLOYEE' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
