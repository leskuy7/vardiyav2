import { ForbiddenException } from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';

describe('LeaveRequestsService', () => {
  function createService() {
    const prisma = {
      organization: { findUnique: jest.fn() },
      leaveRequest: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn()
      },
      employee: { findUnique: jest.fn() },
      leaveType: { findUnique: jest.fn() },
      leaveBalance: { findUnique: jest.fn() },
      shift: { findMany: jest.fn(), update: jest.fn() },
      shiftEvent: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn()
    };

    return { service: new LeaveRequestsService(prisma as unknown as ConstructorParameters<typeof LeaveRequestsService>[0]), prisma };
  }

  it('admin yalnızca kendi organizasyonundaki izinleri listeleyebilir', async () => {
    const { service, prisma } = createService();
    prisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
    prisma.leaveRequest.findMany.mockResolvedValue([]);

    await service.findAll({ role: 'ADMIN', sub: 'admin-1' });

    expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { employee: { organizationId: 'org-1' } }
      })
    );
  });

  it('organizasyonu olmayan admin için liste boş döner', async () => {
    const { service, prisma } = createService();
    prisma.organization.findUnique.mockResolvedValue(null);

    const result = await service.findAll({ role: 'ADMIN', sub: 'admin-1' });

    expect(result).toEqual([]);
    expect(prisma.leaveRequest.findMany).not.toHaveBeenCalled();
  });

  it('çalışan status güncellemede CANCELLED dışına geçemez', async () => {
    const { service, prisma } = createService();
    prisma.leaveRequest.findUnique.mockResolvedValue({
      id: 'leave-1',
      employeeId: 'emp-1',
      status: 'PENDING'
    });

    await expect(
      service.updateStatus('leave-1', { status: 'APPROVED' }, { role: 'EMPLOYEE', employeeId: 'emp-1' })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('manager departman dışı izni iptal edemez', async () => {
    const { service, prisma } = createService();
    prisma.leaveRequest.findUnique.mockResolvedValue({
      id: 'leave-1',
      employeeId: 'emp-2',
      status: 'PENDING',
      employee: { id: 'emp-2', department: 'SALES', organizationId: 'org-1' }
    });
    prisma.employee.findUnique.mockResolvedValue({ id: 'mgr-1', department: 'HR', organizationId: 'org-1' });

    await expect(
      service.updateStatus('leave-1', { status: 'CANCELLED' }, { role: 'MANAGER', employeeId: 'mgr-1', sub: 'user-1' })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
