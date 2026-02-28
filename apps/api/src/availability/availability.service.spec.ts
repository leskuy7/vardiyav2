import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

describe('AvailabilityService', () => {
  function createService() {
    const prisma = {
      availabilityBlock: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn()
      }
    };

    return {
      service: new AvailabilityService(prisma as unknown as ConstructorParameters<typeof AvailabilityService>[0]),
      prisma
    };
  }

  it('employee başka çalışanın müsaitliğini ekleyemez', async () => {
    const { service } = createService();

    await expect(
      service.create(
        {
          employeeId: 'emp-2',
          type: 'UNAVAILABLE',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00'
        },
        { sub: 'u1', role: 'EMPLOYEE', employeeId: 'emp-1' }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('geçersiz saat aralığında 400 döner', async () => {
    const { service } = createService();

    await expect(
      service.create(
        {
          employeeId: 'emp-1',
          type: 'UNAVAILABLE',
          dayOfWeek: 1,
          startTime: '12:00',
          endTime: '09:00'
        },
        { sub: 'u1', role: 'EMPLOYEE', employeeId: 'emp-1' }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('admin create başarılıysa date alanlarını dönüştürerek kaydeder', async () => {
    const { service, prisma } = createService();
    prisma.availabilityBlock.create.mockResolvedValue({ id: 'a1' });

    await service.create(
      {
        employeeId: 'emp-1',
        type: 'UNAVAILABLE',
        dayOfWeek: 2,
        startTime: '08:00',
        endTime: '17:00',
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      },
      { sub: 'admin-1', role: 'ADMIN' }
    );

    expect(prisma.availabilityBlock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        })
      })
    );
  });

  it('remove sırasında kayıt başka kullanıcıya aitse 403 döner', async () => {
    const { service, prisma } = createService();
    prisma.availabilityBlock.findUnique.mockResolvedValue({ id: 'a1', employeeId: 'emp-2', employee: { department: 'D1' } });

    await expect(service.remove('a1', { sub: 'u1', role: 'EMPLOYEE', employeeId: 'emp-1' })).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });
});
