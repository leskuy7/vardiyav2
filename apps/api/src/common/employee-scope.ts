import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type Actor = { role: string; employeeId?: string };

export type EmployeeScope =
  | { type: 'all' }
  | { type: 'self'; employeeId: string }
  | { type: 'department'; employeeId: string; department: string };

export async function getEmployeeScope(prisma: PrismaService, actor?: Actor): Promise<EmployeeScope> {
  if (!actor || actor.role !== 'EMPLOYEE') {
    return { type: 'all' };
  }

  if (!actor.employeeId) {
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Employee scope is missing' });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: actor.employeeId },
    select: { id: true, department: true }
  });

  if (!employee) {
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Employee not found for scope' });
  }

  if (employee.department) {
    return { type: 'department', employeeId: employee.id, department: employee.department };
  }

  return { type: 'self', employeeId: employee.id };
}
