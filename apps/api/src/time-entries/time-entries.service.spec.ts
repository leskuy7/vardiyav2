import { ForbiddenException } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';

function createService() {
  const prisma = {
    organization: { findUnique: jest.fn() },
    employee: { findUnique: jest.fn() },
    shift: { findUnique: jest.fn() },
    timeEntry: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    }
  };
  return { service: new TimeEntriesService(prisma as any), prisma };
}

describe('TimeEntriesService', () => {
  it('employee cannot check in for another employee', async () => {
    const { service, prisma } = createService();
    prisma.timeEntry.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await expect(
      service.checkIn(
        { checkInAt: '2026-03-01T06:00:00.000Z', employeeId: 'emp-2' } as any,
        { role: 'EMPLOYEE', employeeId: 'emp-1' }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('employee check-in for self succeeds', async () => {
    const { service, prisma } = createService();
    prisma.timeEntry.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prisma.timeEntry.create.mockResolvedValue({ id: 'entry-1', employeeId: 'emp-1' });

    const result = await service.checkIn(
      { checkInAt: '2026-03-01T06:00:00.000Z' } as any,
      { role: 'EMPLOYEE', employeeId: 'emp-1' }
    );

    expect(result).toEqual({ id: 'entry-1', employeeId: 'emp-1' });
    expect(prisma.timeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ employeeId: 'emp-1' }) })
    );
  });

  it('admin can check in for another employee', async () => {
    const { service, prisma } = createService();
    prisma.timeEntry.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prisma.timeEntry.create.mockResolvedValue({ id: 'entry-2', employeeId: 'emp-2' });

    const result = await service.checkIn(
      { checkInAt: '2026-03-01T07:00:00.000Z', employeeId: 'emp-2' } as any,
      { role: 'ADMIN' }
    );

    expect(result.employeeId).toBe('emp-2');
  });

  it('check-out araligi mevcut kayitla cakisiyorsa 422 doner', async () => {
    const { service, prisma } = createService();
    prisma.timeEntry.findUnique.mockResolvedValue({
      id: 'entry-1',
      employeeId: 'emp-1',
      checkInAt: new Date('2026-03-01T06:00:00.000Z'),
      status: 'OPEN'
    });
    prisma.timeEntry.findFirst.mockResolvedValue({ id: 'entry-2' });

    await expect(
      service.checkOut(
        'entry-1',
        { checkOutAt: '2026-03-01T10:00:00.000Z' } as any,
        { role: 'EMPLOYEE', employeeId: 'emp-1' }
      )
    ).rejects.toThrow('çakışıyor');
  });
});
