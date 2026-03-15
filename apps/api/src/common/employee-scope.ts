import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type Actor = { role: string; sub?: string; employeeId?: string };

export type EmployeeScope =
  | { type: 'all' }
  | { type: 'all_in_org'; organizationId: string }
  | { type: 'self'; employeeId: string; organizationId?: string | null }
  | { type: 'department'; department: string; employeeId: string; organizationId?: string | null };

export async function getEmployeeScope(prisma: PrismaService, actor?: Actor): Promise<EmployeeScope> {
  if (!actor) {
    return { type: 'all' };
  }

  if (actor.role === 'ADMIN') {
    if (!actor.sub) {
      return { type: 'all' };
    }
    const org = await prisma.organization.findUnique({ where: { adminUserId: actor.sub } });
    if (!org) {
      // Backward compatibility for legacy/single-tenant seeds without organization linkage.
      return { type: 'all' };
    }
    return { type: 'all_in_org', organizationId: org.id };
  }

  if (!actor.employeeId) {
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Çalışan kapsamı bulunamadı' });
  }

  if (actor.role === 'EMPLOYEE') {
    return { type: 'self', employeeId: actor.employeeId };
  }

  const employeeDelegate = (prisma as unknown as { employee?: { findUnique?: Function } }).employee;
  if (!employeeDelegate?.findUnique) {
    return { type: 'self', employeeId: actor.employeeId };
  }

  const employee = await prisma.employee.findUnique({ where: { id: actor.employeeId } });
  if (!employee) {
    return { type: 'self', employeeId: actor.employeeId };
  }

  if (actor.role === 'MANAGER') {
    if (employee.department) {
      return {
        type: 'department',
        department: employee.department,
        employeeId: actor.employeeId,
        organizationId: employee.organizationId
      };
    }
  }

  return { type: 'self', employeeId: actor.employeeId, organizationId: employee.organizationId };
}
