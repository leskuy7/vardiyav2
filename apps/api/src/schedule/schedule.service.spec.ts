import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { DEFAULT_PRINT_FORM_CONFIG } from '../settings/print-form-config';

describe('ScheduleService', () => {
  function createService() {
    const prisma: {
      shift: { findMany: jest.Mock };
      leaveRequest: { findMany: jest.Mock };
      employee: { findMany: jest.Mock; findUnique: jest.Mock };
      organization: { findUnique: jest.Mock };
    } = {
      shift: { findMany: jest.fn() },
      leaveRequest: { findMany: jest.fn().mockResolvedValue([]) },
      employee: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
      organization: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    const mockShiftsService = {
      buildComplianceWarningsForWeek: jest.fn().mockResolvedValue(new Map()),
    };

    const mockSettingsService = {
      getForOrganization: jest.fn().mockResolvedValue({
        printFormConfig: DEFAULT_PRINT_FORM_CONFIG,
      }),
    };

    return {
      service: new ScheduleService(
        prisma as unknown as ConstructorParameters<typeof ScheduleService>[0],
        mockShiftsService as unknown as ConstructorParameters<typeof ScheduleService>[1],
        mockSettingsService as unknown as ConstructorParameters<typeof ScheduleService>[2],
      ),
      prisma,
      mockSettingsService,
    };
  }

  it('employee haftalık planı kendi employeeId kapsamına göre filtreler', async () => {
    const { service, prisma } = createService();
    prisma.shift.findMany.mockResolvedValue([]);

    await service.getWeek('2026-01-05', { role: 'EMPLOYEE', employeeId: 'emp-1' });

    expect(prisma.shift.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ employeeId: 'emp-1' }),
      }),
    );
  });

  it('employeeId eksikse Forbidden döner', async () => {
    const { service, prisma } = createService();
    prisma.shift.findMany.mockResolvedValue([]);

    await expect(service.getWeek('2026-01-05', { role: 'EMPLOYEE' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('haftalik plan leaves alaninda leaveCode dondurur', async () => {
    const { service, prisma } = createService();
    prisma.shift.findMany.mockResolvedValue([]);
    prisma.leaveRequest.findMany.mockResolvedValue([
      {
        id: 'leave-1',
        employeeId: 'emp-1',
        leaveCode: 'ANNUAL',
        reason: 'Yillik izin',
        startDate: new Date('2026-01-05T00:00:00.000Z'),
        endDate: new Date('2026-01-05T00:00:00.000Z'),
        employee: { user: { name: 'Ali' } },
      },
    ]);

    const week = await service.getWeek('2026-01-05', { role: 'EMPLOYEE', employeeId: 'emp-1' });
    const monday = week.days.find((day: any) => day.date === '2026-01-05');

    expect(monday?.leaves?.[0]).toMatchObject({
      id: 'leave-1',
      leaveCode: 'ANNUAL',
    });
  });

  it('print form vardiya saatini aktif sablona gore harf koduna cevirir', async () => {
    const { service, prisma, mockSettingsService } = createService();
    prisma.employee.findUnique.mockResolvedValue({
      id: 'mgr-1',
      department: 'Servis',
      organizationId: 'org-1',
    });
    prisma.employee.findMany.mockResolvedValue([
      {
        id: 'emp-1',
        position: 'Rest Komi',
        department: 'Servis',
        user: { id: 'user-1', name: 'Ali', email: 'ali@test.local' },
      },
    ]);
    prisma.shift.findMany.mockResolvedValue([
      {
        employeeId: 'emp-1',
        startTime: new Date('2026-01-05T05:00:00.000Z'),
        endTime: new Date('2026-01-05T13:00:00.000Z'),
      },
    ]);
    prisma.organization.findUnique.mockResolvedValue({ name: 'Test Org' });
    mockSettingsService.getForOrganization.mockResolvedValue({
      printFormConfig: {
        ...DEFAULT_PRINT_FORM_CONFIG,
        shiftTemplates: [
          {
            code: 'A',
            title: 'SHIFT: A',
            startTime: '08:00',
            endTime: '16:00',
            totalHoursLabel: '8 SAAT',
            isActive: true,
            segments: [],
          },
        ],
      },
    });

    const result = await service.getPrintForm('2026-01-05', 'Servis', { role: 'MANAGER', employeeId: 'mgr-1' });

    expect(result.rows[0]?.days[0]).toBe('A');
  });

  it('print form onayli izni leave code map ile kisaltir', async () => {
    const { service, prisma, mockSettingsService } = createService();
    prisma.employee.findUnique.mockResolvedValue({
      id: 'mgr-1',
      department: 'Servis',
      organizationId: 'org-1',
    });
    prisma.employee.findMany.mockResolvedValue([
      {
        id: 'emp-1',
        position: 'Rest Komi',
        department: 'Servis',
        user: { id: 'user-1', name: 'Ali', email: 'ali@test.local' },
      },
    ]);
    prisma.shift.findMany.mockResolvedValue([]);
    prisma.leaveRequest.findMany.mockResolvedValue([
      {
        employeeId: 'emp-1',
        leaveCode: 'ANNUAL',
        startDate: new Date('2026-01-05T00:00:00.000Z'),
        endDate: new Date('2026-01-05T00:00:00.000Z'),
      },
    ]);
    prisma.organization.findUnique.mockResolvedValue({ name: 'Test Org' });
    mockSettingsService.getForOrganization.mockResolvedValue({
      printFormConfig: {
        ...DEFAULT_PRINT_FORM_CONFIG,
        leaveCodeMap: {
          ...DEFAULT_PRINT_FORM_CONFIG.leaveCodeMap,
          ANNUAL: 'YI',
        },
      },
    });

    const result = await service.getPrintForm('2026-01-05', 'Servis', { role: 'MANAGER', employeeId: 'mgr-1' });

    expect(result.rows[0]?.days[0]).toBe('YI');
  });

  it('print form bos gunu OFF yapar ve eslesmeyen vardiyada saat araligi dondurur', async () => {
    const { service, prisma } = createService();
    prisma.employee.findUnique.mockResolvedValue({
      id: 'mgr-1',
      department: 'Servis',
      organizationId: 'org-1',
    });
    prisma.employee.findMany.mockResolvedValue([
      {
        id: 'emp-1',
        position: 'Rest Komi',
        department: 'Servis',
        user: { id: 'user-1', name: 'Ali', email: 'ali@test.local' },
      },
    ]);
    prisma.shift.findMany.mockResolvedValue([
      {
        employeeId: 'emp-1',
        startTime: new Date('2026-01-05T05:15:00.000Z'),
        endTime: new Date('2026-01-05T13:45:00.000Z'),
      },
    ]);
    prisma.organization.findUnique.mockResolvedValue({ name: 'Test Org' });

    const result = await service.getPrintForm('2026-01-05', 'Servis', { role: 'MANAGER', employeeId: 'mgr-1' });

    expect(result.rows[0]?.days[0]).toBe('08:15-16:45');
    expect(result.rows[0]?.days[1]).toBe('OFF');
  });

  it('print form mevcut department scope filtresini korur', async () => {
    const { service, prisma } = createService();
    prisma.employee.findUnique.mockResolvedValue({
      id: 'mgr-1',
      department: 'Servis',
      organizationId: 'org-1',
    });
    prisma.employee.findMany.mockResolvedValue([
      {
        id: 'emp-1',
        position: 'Rest Komi',
        department: 'Servis',
        user: { id: 'user-1', name: 'Ali', email: 'ali@test.local' },
      },
    ]);
    prisma.shift.findMany.mockResolvedValue([]);
    prisma.organization.findUnique.mockResolvedValue({ name: 'Test Org' });

    await service.getPrintForm('2026-01-05', 'Servis', { role: 'MANAGER', employeeId: 'mgr-1' });

    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          department: 'Servis',
          organizationId: 'org-1',
        }),
      }),
    );
  });

  it('print form kapsam disi department secilirse hata verir', async () => {
    const { service, prisma } = createService();
    prisma.employee.findUnique.mockResolvedValue({
      id: 'mgr-1',
      department: 'Servis',
      organizationId: 'org-1',
    });
    prisma.employee.findMany.mockResolvedValue([
      {
        id: 'emp-1',
        position: 'Rest Komi',
        department: 'Servis',
        user: { id: 'user-1', name: 'Ali', email: 'ali@test.local' },
      },
    ]);

    await expect(
      service.getPrintForm('2026-01-05', 'Mutfak', { role: 'MANAGER', employeeId: 'mgr-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
