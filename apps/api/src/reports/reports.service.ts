import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { getEmployeeScope } from '../common/employee-scope';
import { istanbulDateEndUtc, istanbulDateStartUtc, parseWeekStart, plusDays } from '../common/time.utils';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly scheduledShiftStatuses = ['PROPOSED', 'DRAFT', 'PUBLISHED', 'ACKNOWLEDGED', 'SWAPPED'] as const;

  private overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
    return startA < endB && endA > startB;
  }

  private buildScopedShiftWhere(scope: Awaited<ReturnType<typeof getEmployeeScope>>, start: Date, end: Date) {
    return {
      startTime: { lt: end },
      endTime: { gt: start },
      status: { in: [...this.scheduledShiftStatuses] },
      ...(scope.type === 'all_in_org' ? { employee: { organizationId: scope.organizationId } } : {}),
      ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
      ...(scope.type === 'department'
        ? {
            employee: {
              department: scope.department,
              ...(scope.organizationId ? { organizationId: scope.organizationId } : {})
            }
          }
        : {})
    };
  }

  private buildScopedTimeEntryWhere(scope: Awaited<ReturnType<typeof getEmployeeScope>>, start: Date, end: Date) {
    return {
      checkInAt: { lt: end },
      OR: [{ endAt: null }, { endAt: { gte: start } }],
      ...(scope.type === 'all_in_org' ? { employee: { organizationId: scope.organizationId } } : {}),
      ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
      ...(scope.type === 'department'
        ? {
            employee: {
              department: scope.department,
              ...(scope.organizationId ? { organizationId: scope.organizationId } : {})
            }
          }
        : {})
    };
  }

  private buildScopedLeaveWhere(scope: Awaited<ReturnType<typeof getEmployeeScope>>, start: Date, end: Date) {
    return {
      status: 'APPROVED' as const,
      startAt: { lt: end },
      endAt: { gt: start },
      ...(scope.type === 'all_in_org' ? { employee: { organizationId: scope.organizationId } } : {}),
      ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
      ...(scope.type === 'department'
        ? {
            employee: {
              department: scope.department,
              ...(scope.organizationId ? { organizationId: scope.organizationId } : {})
            }
          }
        : {})
    };
  }

  private readString(value: Prisma.JsonValue | null | undefined) {
    return typeof value === 'string' ? value : null;
  }

  private classifyDirective(directive: string | null) {
    const value = (directive ?? '').toLowerCase();

    if (value.includes('script-src') || value.includes('object-src')) {
      return {
        severity: 'HIGH' as const,
        recommendation: 'Script/Object kaynaklarını gözden geçir, izinli domain listesini daralt.'
      };
    }

    if (value.includes('connect-src') || value.includes('frame-src') || value.includes('frame-ancestors')) {
      return {
        severity: 'MEDIUM' as const,
        recommendation: 'Harici bağlantı ve frame kaynaklarını doğrula, gereksiz originleri kaldır.'
      };
    }

    return {
      severity: 'LOW' as const,
      recommendation: 'Direktif ihlali tekrar ediyorsa policy ve asset URLlerini senkronize et.'
    };
  }

  private parseDateFilterStart(value?: string) {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? istanbulDateStartUtc(normalized)
      : new Date(normalized);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseDateFilterEnd(value?: string) {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? istanbulDateEndUtc(normalized)
      : new Date(normalized);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  async weeklyHours(weekStart: string, actor?: { role: string; sub?: string; employeeId?: string }) {
    const start = parseWeekStart(weekStart);
    const end = plusDays(start, 7);
    const scope = await getEmployeeScope(this.prisma, actor);

    const shifts = await this.prisma.shift.findMany({
      where: {
        startTime: { gte: start },
        endTime: { lt: end },
        status: { in: ['PROPOSED', 'PUBLISHED', 'ACKNOWLEDGED'] },
        ...(scope.type === 'all_in_org' ? { employee: { organizationId: scope.organizationId } } : {}),
        ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
        ...(scope.type === 'department'
          ? {
              employee: {
                department: scope.department,
                ...(scope.organizationId ? { organizationId: scope.organizationId } : {})
              }
            }
          : {})
      },
      include: {
        employee: {
          include: { user: true }
        }
      }
    });

    const summary = new Map<string, { employeeId: string; employeeName: string; hours: number; hourlyRate: number; maxWeeklyHours: number }>();

    for (const shift of shifts) {
      const diffHours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
      const current = summary.get(shift.employeeId) ?? {
        employeeId: shift.employeeId,
        employeeName: shift.employee.user.name,
        hours: 0,
        hourlyRate:
          shift.employee.hourlyRate == null
            ? 0
            : typeof shift.employee.hourlyRate === 'number'
              ? shift.employee.hourlyRate
              : shift.employee.hourlyRate.toNumber(),
        maxWeeklyHours: shift.employee.maxWeeklyHours ?? 45
      };
      current.hours += diffHours;
      summary.set(shift.employeeId, current);
    }

    const rows = Array.from(summary.values()).map((item) => {
      const overtimeHours = Math.max(0, item.hours - item.maxWeeklyHours);
      const regularHours = Math.max(0, item.hours - overtimeHours);
      const overtimeRate = item.hourlyRate * 1.5;
      const regularCost = regularHours * item.hourlyRate;
      const overtimeCost = overtimeHours * overtimeRate;
      return {
        ...item,
        regularHours,
        overtimeHours,
        cost: regularCost + overtimeCost
      };
    });

    const totals = rows.reduce(
      (accumulator, row) => {
        accumulator.hours += row.hours;
        accumulator.cost += row.cost;
        accumulator.overtimeHours += row.overtimeHours;
        return accumulator;
      },
      { hours: 0, overtimeHours: 0, cost: 0 }
    );

    return {
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      employees: rows,
      totals
    };
  }

  async complianceViolations(weekStart: string, actor?: { role: string; sub?: string; employeeId?: string }) {
    const start = parseWeekStart(weekStart);
    const end = plusDays(start, 7);
    const scope = await getEmployeeScope(this.prisma, actor);

    const shifts = await this.prisma.shift.findMany({
      where: {
        startTime: { gte: start },
        endTime: { lt: end },
        status: { not: 'CANCELLED' },
        ...(scope.type === 'all_in_org' ? { employee: { organizationId: scope.organizationId } } : {}),
        ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
        ...(scope.type === 'department'
          ? {
              employee: {
                department: scope.department,
                ...(scope.organizationId ? { organizationId: scope.organizationId } : {})
              }
            }
          : {})
      },
      include: {
        employee: {
          include: { user: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    const byEmployee = new Map<
      string,
      { employeeId: string; employeeName: string; maxWeeklyHours: number; shifts: { startTime: Date; endTime: Date }[] }
    >();

    for (const shift of shifts) {
      const emp = shift.employee;
      const existing = byEmployee.get(shift.employeeId);
      if (!existing) {
        byEmployee.set(shift.employeeId, {
          employeeId: shift.employeeId,
          employeeName: emp.user.name,
          maxWeeklyHours: emp.maxWeeklyHours ?? 45,
          shifts: [{ startTime: shift.startTime, endTime: shift.endTime }]
        });
      } else {
        existing.shifts.push({ startTime: shift.startTime, endTime: shift.endTime });
      }
    }

    const violations: Array<{
      employeeId: string;
      employeeName: string;
      maxHoursViolation?: number;
      no24hRest: boolean;
    }> = [];

    for (const [, item] of byEmployee) {
      const totalHours = item.shifts.reduce(
        (sum, s) => sum + (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60 * 60),
        0
      );
      const maxHoursViolation =
        totalHours > item.maxWeeklyHours ? Number((totalHours - item.maxWeeklyHours).toFixed(1)) : undefined;

      const intervals = item.shifts.map((s) => ({ start: s.startTime.getTime(), end: s.endTime.getTime() }));
      intervals.sort((a, b) => a.start - b.start);
      let maxGapMs = 0;
      let previousEnd = start.getTime();
      for (const iv of intervals) {
        const gap = iv.start - previousEnd;
        if (gap > maxGapMs) maxGapMs = gap;
        if (iv.end > previousEnd) previousEnd = iv.end;
      }
      const finalGap = end.getTime() - previousEnd;
      if (finalGap > maxGapMs) maxGapMs = finalGap;
      const maxGapHours = maxGapMs / (1000 * 60 * 60);
      const no24hRest = maxGapHours < 24;

      if (maxHoursViolation !== undefined || no24hRest) {
        violations.push({
          employeeId: item.employeeId,
          employeeName: item.employeeName,
          ...(maxHoursViolation !== undefined ? { maxHoursViolation } : {}),
          no24hRest
        });
      }
    }

    return {
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      violations
    };
  }

  async attendanceSummary(weekStart: string, actor?: { role: string; sub?: string; employeeId?: string }) {
    const start = parseWeekStart(weekStart);
    const end = plusDays(start, 7);
    const scope = await getEmployeeScope(this.prisma, actor);
    const now = new Date();
    const activeEntryFallbackEnd = now < end ? now : end;

    const [shifts, timeEntries, approvedLeaves] = await Promise.all([
      this.prisma.shift.findMany({
        where: this.buildScopedShiftWhere(scope, start, end),
        include: {
          employee: {
            include: { user: true }
          }
        },
        orderBy: [{ startTime: 'asc' }]
      }),
      this.prisma.timeEntry.findMany({
        where: this.buildScopedTimeEntryWhere(scope, start, end),
        include: {
          employee: {
            include: { user: true }
          },
          shift: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true
            }
          }
        },
        orderBy: [{ status: 'asc' }, { checkInAt: 'asc' }]
      }),
      this.prisma.leaveRequest.findMany({
        where: this.buildScopedLeaveWhere(scope, start, end),
        select: {
          id: true,
          employeeId: true,
          leaveCode: true,
          startAt: true,
          endAt: true,
          startDate: true,
          endDate: true
        }
      })
    ]);

    const entriesByEmployee = new Map<string, typeof timeEntries>();
    for (const entry of timeEntries) {
      const current = entriesByEmployee.get(entry.employeeId) ?? [];
      current.push(entry);
      entriesByEmployee.set(entry.employeeId, current);
    }

    const leavesByEmployee = new Map<string, typeof approvedLeaves>();
    for (const leave of approvedLeaves) {
      const current = leavesByEmployee.get(leave.employeeId) ?? [];
      current.push(leave);
      leavesByEmployee.set(leave.employeeId, current);
    }

    const employeeSummaries = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        department: string | null;
        scheduledShifts: number;
        matchedEntries: number;
        missingEntries: number;
        absentShifts: number;
        openEntries: number;
        leaveProtectedShifts: number;
      }
    >();

    const openEntryItems = timeEntries
      .filter((entry) => entry.status === 'OPEN')
      .map((entry) => ({
        id: entry.id,
        employeeId: entry.employeeId,
        employeeName: entry.employee.user.name,
        department: entry.employee.department,
        checkInAt: entry.checkInAt.toISOString(),
        shiftId: entry.shiftId,
        shiftStartTime: entry.shift?.startTime?.toISOString() ?? null,
        shiftEndTime: entry.shift?.endTime?.toISOString() ?? null,
        shiftStatus: entry.shift?.status ?? null,
        source: entry.source
      }));

    const missingEntryItems: Array<{
      shiftId: string;
      employeeId: string;
      employeeName: string;
      department: string | null;
      shiftStartTime: string;
      shiftEndTime: string;
      shiftStatus: string;
      isAbsent: boolean;
    }> = [];

    const absentShiftItems: Array<{
      shiftId: string;
      employeeId: string;
      employeeName: string;
      department: string | null;
      shiftStartTime: string;
      shiftEndTime: string;
      shiftStatus: string;
    }> = [];
    const usedEntryIds = new Set<string>();

    const findMatchingEntry = (shift: (typeof shifts)[number]) => {
      const employeeEntries = entriesByEmployee.get(shift.employeeId) ?? [];
      const exactShiftEntry = employeeEntries.find((entry) => !usedEntryIds.has(entry.id) && entry.shiftId === shift.id);
      if (exactShiftEntry) {
        usedEntryIds.add(exactShiftEntry.id);
        return exactShiftEntry;
      }

      const overlappingEntry = employeeEntries.find(
        (entry) =>
          !usedEntryIds.has(entry.id) &&
          this.overlaps(
            shift.startTime,
            shift.endTime,
            entry.checkInAt,
            entry.endAt ?? entry.checkOutAt ?? activeEntryFallbackEnd
          )
      );

      if (!overlappingEntry) {
        return null;
      }

      usedEntryIds.add(overlappingEntry.id);
      return overlappingEntry;
    };

    for (const shift of shifts) {
      const employeeSummary = employeeSummaries.get(shift.employeeId) ?? {
        employeeId: shift.employeeId,
        employeeName: shift.employee.user.name,
        department: shift.employee.department,
        scheduledShifts: 0,
        matchedEntries: 0,
        missingEntries: 0,
        absentShifts: 0,
        openEntries: 0,
        leaveProtectedShifts: 0
      };

      employeeSummary.scheduledShifts += 1;

      const overlappingLeave = (leavesByEmployee.get(shift.employeeId) ?? []).find((leave) =>
        this.overlaps(shift.startTime, shift.endTime, leave.startAt, leave.endAt)
      );

      if (overlappingLeave) {
        employeeSummary.leaveProtectedShifts += 1;
        employeeSummaries.set(shift.employeeId, employeeSummary);
        continue;
      }

      const matchingEntry = findMatchingEntry(shift);

      if (matchingEntry) {
        employeeSummary.matchedEntries += 1;
      } else if (shift.startTime <= now) {
        const isAbsent = shift.endTime <= now;
        employeeSummary.missingEntries += 1;
        if (isAbsent) {
          employeeSummary.absentShifts += 1;
        }

        const item = {
          shiftId: shift.id,
          employeeId: shift.employeeId,
          employeeName: shift.employee.user.name,
          department: shift.employee.department,
          shiftStartTime: shift.startTime.toISOString(),
          shiftEndTime: shift.endTime.toISOString(),
          shiftStatus: shift.status,
          isAbsent
        };

        missingEntryItems.push(item);
        if (isAbsent) {
          absentShiftItems.push({
            shiftId: item.shiftId,
            employeeId: item.employeeId,
            employeeName: item.employeeName,
            department: item.department,
            shiftStartTime: item.shiftStartTime,
            shiftEndTime: item.shiftEndTime,
            shiftStatus: item.shiftStatus
          });
        }
      }

      employeeSummaries.set(shift.employeeId, employeeSummary);
    }

    for (const entry of openEntryItems) {
      const summary = employeeSummaries.get(entry.employeeId) ?? {
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        department: entry.department,
        scheduledShifts: 0,
        matchedEntries: 0,
        missingEntries: 0,
        absentShifts: 0,
        openEntries: 0,
        leaveProtectedShifts: 0
      };
      summary.openEntries += 1;
      employeeSummaries.set(entry.employeeId, summary);
    }

    return {
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      scheduledShiftCount: shifts.length,
      timeEntryCount: timeEntries.length,
      openEntries: openEntryItems.length,
      missingEntries: missingEntryItems.length,
      absentShifts: absentShiftItems.length,
      employeesWithoutCheckout: new Set(openEntryItems.map((entry) => entry.employeeId)).size,
      openEntryItems,
      missingEntryItems,
      absentShiftItems,
      employeeSummaries: Array.from(employeeSummaries.values()).sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName, 'tr')
      )
    };
  }

  async securityEvents(params?: { limit?: number; directive?: string; from?: string; to?: string }) {
    const take = Math.max(1, Math.min(200, Math.trunc(params?.limit ?? 50)));
    const directiveFilter = params?.directive?.trim().toLowerCase() ?? '';
    const fromDate = this.parseDateFilterStart(params?.from);
    const toDate = this.parseDateFilterEnd(params?.to);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: 'SECURITY_CSP_REPORT',
        createdAt: {
          gte: fromDate ?? undefined,
          lte: toDate ?? undefined
        }
      },
      orderBy: { createdAt: 'desc' },
      take
    });

    const normalized = logs.map((log) => {
      const details = (log.details ?? {}) as Prisma.JsonObject;
      const sourceIp = this.readString(details.sourceIp);
      const reportValue = details.report;
      const reportObject = (reportValue && typeof reportValue === 'object' && !Array.isArray(reportValue)
        ? reportValue
        : {}) as Prisma.JsonObject;
      const cspReportValue = reportObject['csp-report'];
      const cspReport = (cspReportValue && typeof cspReportValue === 'object' && !Array.isArray(cspReportValue)
        ? cspReportValue
        : reportObject) as Prisma.JsonObject;
      const violatedDirective = this.readString(cspReport['violated-directive']);
      const effectiveDirective = this.readString(cspReport['effective-directive']);
      const directiveForClassification = violatedDirective ?? effectiveDirective;
      const classification = this.classifyDirective(directiveForClassification);

      return {
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        sourceIp,
        documentUri: this.readString(cspReport['document-uri']),
        violatedDirective,
        blockedUri: this.readString(cspReport['blocked-uri']),
        effectiveDirective,
        severity: classification.severity,
        recommendation: classification.recommendation
      };
    });

    if (!directiveFilter) {
      return normalized;
    }

    return normalized.filter((event) => {
      const directiveValue = (event.violatedDirective ?? event.effectiveDirective ?? '').toLowerCase();
      return directiveValue.includes(directiveFilter);
    });
  }

  private async getAuditUserScope(actor?: { role: string; sub?: string; employeeId?: string }) {
    if (!actor) {
      return null;
    }

    if (actor.role === 'ADMIN' && actor.sub) {
      const organization = await this.prisma.organization.findUnique({
        where: { adminUserId: actor.sub }
      });
      if (!organization) {
        return { includeUserIds: [actor.sub] };
      }
      const orgEmployees = await this.prisma.employee.findMany({
        where: { organizationId: organization.id, deletedAt: null },
        select: { userId: true }
      });
      return {
        includeUserIds: Array.from(new Set([actor.sub, ...orgEmployees.map((row) => row.userId)]))
      };
    }

    if (actor.role === 'MANAGER' && actor.employeeId) {
      const manager = await this.prisma.employee.findUnique({
        where: { id: actor.employeeId },
        select: { department: true, organizationId: true, userId: true }
      });
      if (!manager) {
        return null;
      }
      const scopedEmployees = await this.prisma.employee.findMany({
        where: {
          deletedAt: null,
          department: manager.department,
          ...(manager.organizationId ? { organizationId: manager.organizationId } : {})
        },
        select: { userId: true }
      });
      return {
        includeUserIds: Array.from(new Set([manager.userId, ...scopedEmployees.map((row) => row.userId)]))
      };
    }

    return null;
  }

  async auditTrail(
    params?: {
      limit?: number;
      action?: string;
      entityType?: string;
      userId?: string;
      from?: string;
      to?: string;
    },
    actor?: { role: string; sub?: string; employeeId?: string }
  ) {
    const take = Math.max(1, Math.min(500, Math.trunc(params?.limit ?? 100)));
    const actionFilter = params?.action?.trim();
    const entityTypeFilter = params?.entityType?.trim();
    const userIdFilter = params?.userId?.trim();
    const fromDate = this.parseDateFilterStart(params?.from);
    const toDate = this.parseDateFilterEnd(params?.to);
    const scope = await this.getAuditUserScope(actor);

    const rows = await this.prisma.auditLog.findMany({
      where: {
        ...(actionFilter ? { action: actionFilter } : {}),
        ...(entityTypeFilter ? { entityType: entityTypeFilter } : {}),
        ...(userIdFilter ? { userId: userIdFilter } : {}),
        ...(scope?.includeUserIds ? { userId: { in: scope.includeUserIds } } : {}),
        createdAt: {
          gte: fromDate ?? undefined,
          lte: toDate ?? undefined
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take
    });

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      userId: row.userId,
      user: row.user,
      details: row.details ?? {}
    }));
  }
}
