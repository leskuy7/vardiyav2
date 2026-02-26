import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type Actor = { role: string; employeeId?: string };

export type EmployeeScope =
  | { type: 'all' }
  | { type: 'self'; employeeId: string };

export async function getEmployeeScope(prisma: PrismaService, actor?: Actor): Promise<EmployeeScope> {
  if (!actor || actor.role !== 'EMPLOYEE') {
    return { type: 'all' };
  }

  if (!actor.employeeId) {
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Employee scope is missing' });
  }

  return { type: 'self', employeeId: actor.employeeId };
}
