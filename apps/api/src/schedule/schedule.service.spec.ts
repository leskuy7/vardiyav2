import { ForbiddenException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  function createService() {
    const prisma: {
      employee: { findUnique: jest.Mock };
      shift: { findMany: jest.Mock };
    } = {
      employee: { findUnique: jest.fn() },
      shift: { findMany: jest.fn() }
    };

    return { service: new ScheduleService(prisma as never), prisma };
  }

  it('employee departmanı varsa haftalık planı departmana göre filtreler', async () => {
    const { service, prisma } = createService();
    prisma.employee.findUnique.mockResolvedValue({ id: 'emp-1', department: 'Operasyon' });
    prisma.shift.findMany.mockResolvedValue([]);

    await service.getWeek('2026-01-05', { role: 'EMPLOYEE', employeeId: 'emp-1' });

    expect(prisma.shift.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ employee: { department: 'Operasyon' } })
      })
    );
  });

  it('employee kaydı yoksa Forbidden döner', async () => {
    const { service, prisma } = createService();
    prisma.employee.findUnique.mockResolvedValue(null);

    await expect(service.getWeek('2026-01-05', { role: 'EMPLOYEE', employeeId: 'emp-1' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
