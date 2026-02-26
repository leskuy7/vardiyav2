import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  function createService() {
    const prisma = {
      user: {
        findUnique: jest.fn()
      },
      employee: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      $transaction: jest.fn()
    };

    return {
      service: new EmployeesService(prisma as unknown as ConstructorParameters<typeof EmployeesService>[0]),
      prisma
    };
  }

  it('aynı email ile çalışan oluşturulamaz', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

    await expect(
      service.create({
        email: 'exists@example.com',
        password: 'Test12345!',
        firstName: 'Ali',
        lastName: 'Veli'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('getById bulunamazsa 404 döner', async () => {
    const { service, prisma } = createService();
    prisma.employee.findFirst.mockResolvedValue(null);

    await expect(service.getById('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove çalışanı soft-delete ile arşivler', async () => {
    const { service, prisma } = createService();

    prisma.employee.findFirst.mockResolvedValue({
      id: 'emp-1',
      deletedAt: null,
      user: { id: 'u1' }
    });

    prisma.employee.update.mockResolvedValue({ id: 'emp-1' });

    await service.remove('emp-1');

    expect(prisma.employee.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'emp-1' },
        data: expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date)
        })
      })
    );
  });
});
