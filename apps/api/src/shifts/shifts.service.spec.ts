import { BadRequestException, ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { ShiftsService } from './shifts.service';

describe('ShiftsService', () => {
  function createService() {
    const prisma: {
      availabilityBlock: { findMany: jest.Mock };
      employee: { findUnique: jest.Mock };
      shift: {
        findFirst: jest.Mock;
        create: jest.Mock;
        findUnique: jest.Mock;
        update: jest.Mock;
        findMany: jest.Mock;
      };
      $transaction: jest.Mock;
    } = {
      availabilityBlock: { findMany: jest.fn() },
      employee: { findUnique: jest.fn() },
      shift: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn()
      },
      $transaction: jest.fn()
    };

    return { service: new ShiftsService(prisma as unknown as ConstructorParameters<typeof ShiftsService>[0]), prisma };
  }

  it('overlap olduğunda 409 döner', async () => {
    const { service, prisma } = createService();
    prisma.shift.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create({
        employeeId: 'emp-1',
        startTime: '2026-01-01T08:00:00.000Z',
        endTime: '2026-01-01T16:00:00.000Z'
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('UNAVAILABLE blokta forceOverride yoksa 422 döner', async () => {
    const { service, prisma } = createService();
    prisma.shift.findFirst.mockResolvedValue(null);
    prisma.availabilityBlock.findMany.mockResolvedValue([
      {
        type: 'UNAVAILABLE',
        dayOfWeek: 4,
        startTime: '08:00',
        endTime: '17:00',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31')
      }
    ]);

    await expect(
      service.create({
        employeeId: 'emp-1',
        startTime: '2026-01-01T08:00:00.000Z',
        endTime: '2026-01-01T12:00:00.000Z',
        forceOverride: false
      })
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('forceOverride true ise warning ile oluşturur', async () => {
    const { service, prisma } = createService();
    prisma.shift.findFirst.mockResolvedValue(null);
    prisma.availabilityBlock.findMany.mockResolvedValue([
      {
        type: 'UNAVAILABLE',
        dayOfWeek: 4,
        startTime: '08:00',
        endTime: '17:00',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31')
      }
    ]);
    prisma.shift.create.mockResolvedValue({ id: 'shift-1', employeeId: 'emp-1' });

    const result = await service.create({
      employeeId: 'emp-1',
      startTime: '2026-01-01T08:00:00.000Z',
      endTime: '2026-01-01T12:00:00.000Z',
      forceOverride: true
    });
    expect(result.warnings).toContain('UNAVAILABLE block overridden on start day');
  });

  it('shift aralığı blok aralığını kapsadığında conflict üretir', async () => {
    const { service, prisma } = createService();
    prisma.shift.findFirst.mockResolvedValue(null);
    prisma.availabilityBlock.findMany.mockResolvedValue([
      {
        type: 'UNAVAILABLE',
        dayOfWeek: 4,
        startTime: '10:00',
        endTime: '12:00',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31')
      }
    ]);

    await expect(
      service.create({
        employeeId: 'emp-1',
        startTime: '2026-01-01T09:00:00.000Z',
        endTime: '2026-01-01T13:00:00.000Z'
      })
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('employee sadece kendi vardiyalarını listeler', async () => {
    const { service, prisma } = createService();
    prisma.shift.findMany.mockResolvedValue([]);

    await service.list(undefined, undefined, undefined, undefined, { role: 'EMPLOYEE', employeeId: 'emp-1' });

    expect(prisma.shift.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ employeeId: 'emp-1' })
      })
    );
  });

  it('employee başkasının vardiya detayını göremez', async () => {
    const { service, prisma } = createService();
    prisma.shift.findUnique.mockResolvedValue({
      id: 'shift-1',
      employeeId: 'emp-2'
    });

    await expect(service.getById('shift-1', { role: 'EMPLOYEE', employeeId: 'emp-1' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('update invalid time range için 400 döner', async () => {
    const { service, prisma } = createService();
    prisma.shift.findUnique.mockResolvedValue({ id: 'shift-1', employeeId: 'emp-1' });

    await expect(
      service.update('shift-1', {
        employeeId: 'emp-1',
        startTime: '2026-01-01T16:00:00.000Z',
        endTime: '2026-01-01T08:00:00.000Z'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
