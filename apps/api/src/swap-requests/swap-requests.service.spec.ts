import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { SwapRequestsService } from './swap-requests.service';

describe('SwapRequestsService', () => {
  function createService() {
    const prisma = {
      organization: { findUnique: jest.fn() },
      employee: { findUnique: jest.fn() },
      shift: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn()
      },
      leaveRequest: { findFirst: jest.fn() },
      swapRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      shiftEvent: { create: jest.fn() },
      $transaction: jest.fn()
    };

    return { service: new SwapRequestsService(prisma as any), prisma };
  }

  it('ayni vardiya icin ikinci pending takas talebini engeller', async () => {
    const { service, prisma } = createService();
    prisma.swapRequest.findFirst.mockResolvedValue({ id: 'existing-pending' });

    await expect(
      service.create({ shiftId: 'shift-1' } as any, { role: 'EMPLOYEE', employeeId: 'emp-1' })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('approve sirasinda hedef vardiya cakismasi varsa 409 doner', async () => {
    const { service, prisma } = createService();
    prisma.swapRequest.findUnique.mockResolvedValue({
      id: 'swap-1',
      status: 'PENDING',
      requesterId: 'emp-1',
      targetEmployeeId: null,
      shiftId: 'shift-1',
      shift: {
        id: 'shift-1',
        status: 'PUBLISHED',
        startTime: new Date('2026-03-10T08:00:00.000Z'),
        endTime: new Date('2026-03-10T16:00:00.000Z')
      }
    });
    prisma.employee.findUnique
      .mockResolvedValueOnce({ id: 'emp-1', department: 'OPS', organizationId: 'org-1' })
      .mockResolvedValueOnce({ id: 'mgr-1', department: 'OPS', organizationId: 'org-1' })
      .mockResolvedValueOnce({ id: 'emp-2', department: 'OPS', organizationId: 'org-1', isActive: true, deletedAt: null });
    prisma.shift.findFirst.mockResolvedValue({ id: 'conflicting-shift' });

    await expect(
      service.approve('swap-1', { role: 'MANAGER', employeeId: 'mgr-1' }, 'emp-2')
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('approve sirasinda hedef izin cakismasi varsa 422 doner', async () => {
    const { service, prisma } = createService();
    prisma.swapRequest.findUnique.mockResolvedValue({
      id: 'swap-1',
      status: 'PENDING',
      requesterId: 'emp-1',
      targetEmployeeId: null,
      shiftId: 'shift-1',
      shift: {
        id: 'shift-1',
        status: 'PUBLISHED',
        startTime: new Date('2026-03-10T08:00:00.000Z'),
        endTime: new Date('2026-03-10T16:00:00.000Z')
      }
    });
    prisma.employee.findUnique
      .mockResolvedValueOnce({ id: 'emp-1', department: 'OPS', organizationId: 'org-1' })
      .mockResolvedValueOnce({ id: 'mgr-1', department: 'OPS', organizationId: 'org-1' })
      .mockResolvedValueOnce({ id: 'emp-2', department: 'OPS', organizationId: 'org-1', isActive: true, deletedAt: null });
    prisma.shift.findFirst.mockResolvedValue(null);
    prisma.leaveRequest.findFirst.mockResolvedValue({ id: 'leave-1' });

    await expect(
      service.approve('swap-1', { role: 'MANAGER', employeeId: 'mgr-1' }, 'emp-2')
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
