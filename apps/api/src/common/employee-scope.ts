import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type Actor = { role: string; employeeId?: string };

export type EmployeeScope =
  | { type: 'all' }
  | { type: 'self'; employeeId: string }
  | { type: 'department'; department: string; employeeId: string };

export async function getEmployeeScope(prisma: PrismaService, actor?: Actor): Promise<EmployeeScope> {
  if (!actor || actor.role === 'ADMIN') {
    return { type: 'all' };
  }

  if (!actor.employeeId) {
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Employee scope is missing' });
  }

  if (actor.role === 'MANAGER') {
    const manager = await prisma.employee.findUnique({ where: { id: actor.employeeId } });
    if (manager?.department) {
      return { type: 'department', department: manager.department, employeeId: actor.employeeId };
    }
  }

  return { type: 'self', employeeId: actor.employeeId };
}
