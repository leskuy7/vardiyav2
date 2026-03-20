import { BadRequestException, Injectable, Inject, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmployeeScope, getEmployeeScope } from '../common/employee-scope';
import { parseWeekStart, plusDays, toIsoDate } from '../common/time.utils';
import { PrismaService } from '../database/prisma.service';
import {
  DEFAULT_PRINT_FORM_CONFIG,
  PrintFormConfig,
  PrintFormShiftTemplate,
  normalizePrintFormConfig,
} from '../settings/print-form-config';
import { SettingsService } from '../settings/settings.service';
import { ShiftsService } from '../shifts/shifts.service';

const PRINT_DAY_LABELS = ['P.TESI', 'SALI', 'CARS', 'PERS', 'CUMA', 'C.TESI', 'PAZAR'];
const ISTANBUL_UTC_OFFSET_MINUTES = 180;

type Actor = { role: string; sub?: string; employeeId?: string };

type PrintFormShift = {
  employeeId: string;
  startTime: Date;
  endTime: Date;
};

type PrintFormLeave = {
  employeeId: string;
  leaveCode: string;
  startDate: Date;
  endDate: Date;
};

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ShiftsService)) private readonly shiftsService: ShiftsService,
    private readonly settingsService: SettingsService,
  ) { }

  async getWeek(start: string, actor?: Actor) {
    const startDate = parseWeekStart(start);
    const endDate = plusDays(startDate, 7);
    const scope = await getEmployeeScope(this.prisma, actor);

    const shifts = await this.prisma.shift.findMany({
      where: {
        startTime: { gte: startDate },
        endTime: { lt: endDate },
        status: { not: 'CANCELLED' },
        ...(scope.type === 'all_in_org' ? { employee: { organizationId: scope.organizationId } } : {}),
        ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
        ...(scope.type === 'department'
          ? {
              employee: {
                department: scope.department,
                ...(scope.organizationId ? { organizationId: scope.organizationId } : {}),
              },
            }
          : {}),
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
        swapRequests: {
          where: { status: 'PENDING' },
        },
      },
      orderBy: [{ startTime: 'asc' }],
    });
    const warningsByShiftId = await this.shiftsService.buildComplianceWarningsForWeek(
      shifts.map((shift) => ({
        id: shift.id,
        employeeId: shift.employeeId,
        startTime: shift.startTime,
        endTime: shift.endTime,
      })),
    );

    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lt: endDate },
        endDate: { gte: startDate },
        ...(scope.type === 'all_in_org' ? { employee: { organizationId: scope.organizationId } } : {}),
        ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
        ...(scope.type === 'department'
          ? {
              employee: {
                department: scope.department,
                ...(scope.organizationId ? { organizationId: scope.organizationId } : {}),
              },
            }
          : {}),
      },
      include: {
        employee: {
          include: { user: true },
        },
      },
    });

    const days = Array.from({ length: 7 }).map((_, index) => {
      const dayDate = plusDays(startDate, index);
      const dayIso = toIsoDate(dayDate);

      const dailyShifts = shifts.filter((shift: any) => toIsoDate(shift.startTime) === dayIso);

      const dailyLeaves = leaves.filter((leave: any) => {
        const leaveStart = toIsoDate(leave.startDate);
        const leaveEnd = toIsoDate(leave.endDate);
        return dayIso >= leaveStart && dayIso <= leaveEnd;
      });

      const mappedShifts = dailyShifts.map((shift: any) => ({
        id: shift.id,
        employeeId: shift.employeeId,
        employeeName: shift.employee.user.name,
        start: shift.startTime.toISOString(),
        end: shift.endTime.toISOString(),
        status: shift.status,
        note: shift.note,
        swapRequests: shift.swapRequests,
        warnings: warningsByShiftId.get(shift.id) ?? [],
      }));

      return {
        date: dayIso,
        shifts: mappedShifts,
        leaves: dailyLeaves.map((leave: any) => ({
          id: leave.id,
          employeeId: leave.employeeId,
          employeeName: leave.employee.user.name,
          leaveCode: leave.leaveCode,
          reason: leave.reason,
        })),
      };
    });

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      days,
    };
  }

  async getPrint(start: string, actor?: Actor) {
    const week = await this.getWeek(start, actor);
    return {
      ...week,
      businessName: 'Vardiya',
      generatedAt: new Date().toISOString(),
    };
  }

  async getPrintForm(start: string, department?: string, actor?: Actor) {
    const startDate = parseWeekStart(start);
    const endDate = plusDays(startDate, 7);
    const scope = await getEmployeeScope(this.prisma, actor);
    const organizationId = this.getOrganizationId(scope);
    const settings = organizationId
      ? await this.settingsService.getForOrganization(organizationId)
      : { printFormConfig: DEFAULT_PRINT_FORM_CONFIG };
    const printFormConfig = normalizePrintFormConfig(settings.printFormConfig);

    const employeesInScope = await this.prisma.employee.findMany({
      where: this.buildEmployeeScopeWhere(scope),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ user: { name: 'asc' } }],
    });

    const availableDepartments = Array.from(
      new Set(
        employeesInScope
          .map((employee) => employee.department)
          .filter((department): department is string => typeof department === 'string' && department.length > 0),
      ),
    ).sort((left, right) => left.localeCompare(right, 'tr'));
    const normalizedDepartment = department?.trim();

    if (normalizedDepartment && normalizedDepartment !== 'all' && !availableDepartments.includes(normalizedDepartment)) {
      throw new BadRequestException({
        code: 'INVALID_DEPARTMENT',
        message: 'Secilen departman bu kapsam icin gecerli degil.',
      });
    }

    const selectedEmployees = normalizedDepartment && normalizedDepartment !== 'all'
      ? employeesInScope.filter((employee) => employee.department === normalizedDepartment)
      : employeesInScope;

    const employeeIds = selectedEmployees.map((employee) => employee.id);
    const shifts = employeeIds.length > 0
      ? await this.prisma.shift.findMany({
          where: {
            employeeId: { in: employeeIds },
            startTime: { gte: startDate },
            endTime: { lt: endDate },
            status: { not: 'CANCELLED' },
          },
          select: {
            employeeId: true,
            startTime: true,
            endTime: true,
          },
          orderBy: [{ startTime: 'asc' }],
        })
      : [];

    const leaves = employeeIds.length > 0
      ? await this.prisma.leaveRequest.findMany({
          where: {
            employeeId: { in: employeeIds },
            status: 'APPROVED',
            startDate: { lt: endDate },
            endDate: { gte: startDate },
          },
          select: {
            employeeId: true,
            leaveCode: true,
            startDate: true,
            endDate: true,
          },
        })
      : [];

    const organizationName = await this.getOrganizationName(organizationId);
    const dayHeaders = Array.from({ length: 7 }).map((_, index) => {
      const dayDate = plusDays(startDate, index);
      const dayIso = toIsoDate(dayDate);

      return {
        date: dayIso,
        dateLabel: this.formatPrintDateLabel(dayIso),
        dayLabel: PRINT_DAY_LABELS[index],
      };
    });

    const rows = selectedEmployees.map((employee) => ({
      source: 'employee' as const,
      employeeId: employee.id,
      name: employee.user.name,
      position: employee.position ?? employee.department ?? '',
      days: dayHeaders.map((dayHeader) =>
        this.resolvePrintFormCellValue(employee.id, dayHeader.date, shifts, leaves, printFormConfig),
      ),
      signatureColumns: Array.from({ length: 7 }, () => ''),
    }));

    return {
      organizationName,
      selectedDepartment: normalizedDepartment && normalizedDepartment !== 'all'
        ? normalizedDepartment
        : 'Tum Departmanlar',
      weekStart: toIsoDate(startDate),
      weekEnd: toIsoDate(plusDays(startDate, 6)),
      rowsPerPage: printFormConfig.rowsPerPage,
      headerDefaults: printFormConfig.headerDefaults,
      leaveCodeMap: printFormConfig.leaveCodeMap,
      shiftTemplates: printFormConfig.shiftTemplates,
      availableCodes: this.buildAvailableCodes(printFormConfig),
      availableDepartments,
      dayHeaders,
      rows,
    };
  }

  private buildEmployeeScopeWhere(scope: EmployeeScope): Prisma.EmployeeWhereInput {
    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      isActive: true,
    };

    if (scope.type === 'all_in_org') {
      where.organizationId = scope.organizationId;
    }

    if (scope.type === 'self') {
      where.id = scope.employeeId;
    }

    if (scope.type === 'department') {
      where.department = scope.department;
      if (scope.organizationId) {
        where.organizationId = scope.organizationId;
      }
    }

    return where;
  }

  private getOrganizationId(scope: EmployeeScope): string | undefined {
    if (scope.type === 'all_in_org') return scope.organizationId;
    if (scope.type === 'department' || scope.type === 'self') {
      return scope.organizationId ?? undefined;
    }
    return undefined;
  }

  private async getOrganizationName(organizationId?: string) {
    if (!organizationId) return 'Vardiya';

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    return organization?.name ?? 'Vardiya';
  }

  private formatPrintDateLabel(value: string) {
    return new Date(`${value}T00:00:00.000Z`)
      .toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
      .replace(' ', '.');
  }

  private resolvePrintFormCellValue(
    employeeId: string,
    dayIso: string,
    shifts: PrintFormShift[],
    leaves: PrintFormLeave[],
    config: PrintFormConfig,
  ) {
    const dayLeaves = leaves.filter((leave) => {
      const leaveStart = toIsoDate(leave.startDate);
      const leaveEnd = toIsoDate(leave.endDate);
      return leave.employeeId === employeeId && dayIso >= leaveStart && dayIso <= leaveEnd;
    });

    if (dayLeaves.length > 0) {
      const leave = dayLeaves[0];
      return config.leaveCodeMap[leave.leaveCode] ?? config.leaveCodeMap.OTHER ?? leave.leaveCode;
    }

    const dayShifts = shifts.filter(
      (shift) => shift.employeeId === employeeId && this.getIstanbulDatePart(shift.startTime) === dayIso,
    );

    if (dayShifts.length === 0) {
      return config.leaveCodeMap.OFF ?? 'OFF';
    }

    return dayShifts
      .map((shift) => this.matchShiftTemplate(shift, config.shiftTemplates) ?? this.formatShiftRange(shift))
      .join(' / ');
  }

  private buildAvailableCodes(config: PrintFormConfig) {
    const codes = new Set<string>();

    for (const template of config.shiftTemplates) {
      if (template.code) {
        codes.add(template.code);
      }
    }

    for (const value of Object.values(config.leaveCodeMap)) {
      if (value) {
        codes.add(value);
      }
    }

    return Array.from(codes.values()).sort((left, right) => left.localeCompare(right, 'tr'));
  }

  private matchShiftTemplate(shift: PrintFormShift, templates: PrintFormShiftTemplate[]) {
    const startTime = this.getIstanbulTimePart(shift.startTime);
    const endTime = this.getIstanbulTimePart(shift.endTime);
    const match = templates.find(
      (template) =>
        template.isActive &&
        template.startTime === startTime &&
        template.endTime === endTime,
    );

    return match?.code;
  }

  private formatShiftRange(shift: PrintFormShift) {
    return `${this.getIstanbulTimePart(shift.startTime)}-${this.getIstanbulTimePart(shift.endTime)}`;
  }

  private getIstanbulDatePart(value: Date) {
    const shifted = new Date(value.getTime() + ISTANBUL_UTC_OFFSET_MINUTES * 60 * 1000);
    const year = shifted.getUTCFullYear();
    const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const day = String(shifted.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getIstanbulTimePart(value: Date) {
    const shifted = new Date(value.getTime() + ISTANBUL_UTC_OFFSET_MINUTES * 60 * 1000);
    const hours = String(shifted.getUTCHours()).padStart(2, '0');
    const minutes = String(shifted.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
