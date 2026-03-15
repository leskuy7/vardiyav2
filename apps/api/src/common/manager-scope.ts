import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Actor } from './employee-scope';

/**
 * For MANAGER actors, asserts that the target employee is in the same department and organization.
 * For EMPLOYEE actors, asserts they can only access their own resources.
 * ADMIN and ROOT actors are always allowed.
 */
export async function assertActorAccessToEmployee(
  prisma: PrismaService,
  actor: Actor,
  targetEmployeeId: string,
): Promise<void> {
  if (actor.role === 'ROOT' || actor.role === 'ADMIN') return;

  if (actor.role === 'EMPLOYEE') {
    if (actor.employeeId !== targetEmployeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: `Yalnızca kendi kaynaklarınızı yönetebilirsiniz` });
    }
    return;
  }

  if (actor.role === 'MANAGER' && actor.employeeId) {
    const [manager, target] = await Promise.all([
      prisma.employee.findUnique({ where: { id: actor.employeeId }, select: { department: true, organizationId: true } }),
      prisma.employee.findUnique({ where: { id: targetEmployeeId }, select: { department: true, organizationId: true } }),
    ]);
    if (!target || !manager) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: `Yalnızca kendi departmanınızdaki çalışanları yönetebilirsiniz` });
    }
    if (target.department !== manager.department || target.organizationId !== manager.organizationId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: `Yalnızca kendi departmanınızdaki çalışanları yönetebilirsiniz` });
    }
  }
}

/**
 * Returns manager's department and organizationId for filtering queries.
 * Returns null if manager employee record not found.
 */
export async function getManagerDeptFilter(
  prisma: PrismaService,
  actor: Actor,
): Promise<{ department: string | null; organizationId: string | null } | null> {
  if (actor.role !== 'MANAGER' || !actor.employeeId) return null;
  const manager = await prisma.employee.findUnique({
    where: { id: actor.employeeId },
    select: { department: true, organizationId: true },
  });
  return manager;
}
