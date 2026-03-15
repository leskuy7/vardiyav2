import { BadRequestException, ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { ShiftsService } from './shifts.service';

describe('ShiftsService', () => {
  function createService() {
    const prisma: {
      organization: { findUnique: jest.Mock };
      availabilityBlock: { findMany: jest.Mock };
      employee: { findUnique: jest.Mock };
      shift: {
        findFirst: jest.Mock;
        create: jest.Mock;
        findUnique: jest.Mock;
        update: jest.Mock;
        findMany: jest.Mock;
      };
      leaveRequest: { findFirst: jest.Mock };
      shiftEvent: { create: jest.Mock };
      $transaction: jest.Mock;
    } = {
      organization: { findUnique: jest.fn() },
      availabilityBlock: { findMany: jest.fn() },
      employee: { findUnique: jest.fn() },
      shift: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn()
      },
      leaveRequest: { findFirst: jest.fn().mockResolvedValue(null) },
      shiftEvent: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn()
    };

    return { service: new ShiftsService(prisma as unknown as ConstructorParameters<typeof ShiftsService>[0]), prisma };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('overlap olduğunda 409 döner', async () => {
    const { service, prisma } = createService();
    prisma.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      isActive: true,
      deletedAt: null,
      department: 'OPS',
      organizationId: 'org-1'
    });
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
    prisma.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      isActive: true,
      deletedAt: null,
      department: 'OPS',
      organizationId: 'org-1'
    });
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
    prisma.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      isActive: true,
      deletedAt: null,
      department: 'OPS',
      organizationId: 'org-1',
      maxWeeklyHours: 45
    });
    prisma.shift.findFirst.mockResolvedValue(null);
    prisma.shift.findMany.mockResolvedValue([]);
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
    expect(result.warnings).toContain('Başlangıç günündeki müsaitlik kısıtlaması (UNAVAILABLE) geçersiz kılındı.');
  });

  it('shift aralığı blok aralığını kapsadığında conflict üretir', async () => {
    const { service, prisma } = createService();
    prisma.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      isActive: true,
      deletedAt: null,
      department: 'OPS',
      organizationId: 'org-1'
    });
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
        startTime: '2026-01-01T07:00:00.000Z',
        endTime: '2026-01-01T11:00:00.000Z'
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
    prisma.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      isActive: true,
      deletedAt: null,
      department: 'OPS',
      organizationId: 'org-1'
    });
    prisma.shift.findUnique.mockResolvedValue({ id: 'shift-1', employeeId: 'emp-1' });

    await expect(
      service.update('shift-1', {
        employeeId: 'emp-1',
        startTime: '2026-01-01T16:00:00.000Z',
        endTime: '2026-01-01T08:00:00.000Z'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('onaylı izin ile çakışan vardiya için 422 döner', async () => {
    const { service, prisma } = createService();
    prisma.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      isActive: true,
      deletedAt: null,
      department: 'OPS',
      organizationId: 'org-1'
    });
    prisma.shift.findFirst.mockResolvedValue(null);
    prisma.leaveRequest.findFirst.mockResolvedValue({ id: 'leave-1' });
    prisma.availabilityBlock.findMany.mockResolvedValue([]);

    await expect(
      service.create({
        employeeId: 'emp-1',
        startTime: '2026-01-01T08:00:00.000Z',
        endTime: '2026-01-01T16:00:00.000Z'
      })
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('admin organizasyon dışı çalışana vardiya atayamaz', async () => {
    const { service, prisma } = createService();
    prisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
    prisma.employee.findUnique.mockResolvedValue({
      id: 'emp-2',
      organizationId: 'org-2',
      isActive: true,
      deletedAt: null,
      department: 'OPS'
    });

    await expect(
      service.create(
        {
          employeeId: 'emp-2',
          startTime: '2026-01-01T08:00:00.000Z',
          endTime: '2026-01-01T16:00:00.000Z'
        },
        { role: 'ADMIN', sub: 'admin-1' }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('admin organizasyon dışı vardiya detayını göremez', async () => {
    const { service, prisma } = createService();
    prisma.shift.findUnique.mockResolvedValue({ id: 'shift-1', employeeId: 'emp-2' });
    prisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
    prisma.employee.findUnique.mockResolvedValue({ organizationId: 'org-2' });

    await expect(service.getById('shift-1', { role: 'ADMIN', sub: 'admin-1' })).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it('pasif çalışana vardiya atanamaz', async () => {
    const { service, prisma } = createService();
    prisma.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      isActive: false,
      deletedAt: null,
      department: 'OPS',
      organizationId: 'org-1'
    });

    await expect(
      service.create({
        employeeId: 'emp-1',
        startTime: '2026-01-01T08:00:00.000Z',
        endTime: '2026-01-01T16:00:00.000Z'
      })
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
