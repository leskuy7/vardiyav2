import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { getEmployeeScope } from '../common/employee-scope';
import { parseWeekStart, plusDays } from '../common/time.utils';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async weeklyHours(weekStart: string, actor?: { role: string; employeeId?: string }) {
    const start = parseWeekStart(weekStart);
    const end = plusDays(start, 7);
    const scope = await getEmployeeScope(this.prisma, actor);

    const shifts = await this.prisma.shift.findMany({
      where: {
        startTime: { gte: start },
        endTime: { lt: end },
        status: { in: ['PROPOSED', 'PUBLISHED', 'ACKNOWLEDGED'] },
        ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
        ...(scope.type === 'department' ? { employee: { department: scope.department } } : {})
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

  async complianceViolations(weekStart: string, actor?: { role: string; employeeId?: string }) {
    const start = parseWeekStart(weekStart);
    const end = plusDays(start, 7);
    const scope = await getEmployeeScope(this.prisma, actor);

    const shifts = await this.prisma.shift.findMany({
      where: {
        startTime: { gte: start },
        endTime: { lt: end },
        status: { not: 'CANCELLED' },
        ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
        ...(scope.type === 'department' ? { employee: { department: scope.department } } : {})
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

  async securityEvents(params?: { limit?: number; directive?: string; from?: string; to?: string }) {
    const take = Math.max(1, Math.min(200, Math.trunc(params?.limit ?? 50)));
    const directiveFilter = params?.directive?.trim().toLowerCase() ?? '';
    const fromDate = params?.from ? new Date(params.from) : null;
    const toDate = params?.to ? new Date(params.to) : null;

    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: 'SECURITY_CSP_REPORT',
        createdAt: {
          gte: fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined,
          lte: toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined
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
}
