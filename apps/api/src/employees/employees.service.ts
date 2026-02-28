import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

const USER_SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) { }

  async list(active?: boolean, actor?: { role: string; employeeId?: string }) {
    const where: Prisma.EmployeeWhereInput = {
      isActive: active,
      deletedAt: null
    };

    if (actor?.role === 'MANAGER' && actor.employeeId) {
      const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
      if (manager) {
        where.department = manager.department;
      }
    }

    return this.prisma.employee.findMany({
      where,
      include: { user: { select: USER_SAFE_SELECT } },
      orderBy: [{ createdAt: 'desc' }]
    });
  }

  async getById(id: string, actor?: { role: string; employeeId?: string }) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: USER_SAFE_SELECT } }
    });

    if (!employee) {
      throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Çalışan bulunamadı' });
    }

    if (actor?.role === 'MANAGER' && actor.employeeId) {
      const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
      if (manager && employee.department !== manager.department) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only access employees in your department' });
      }
    }

    return employee;
  }

  async create(dto: CreateEmployeeDto, actor?: { role: string; employeeId?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException({ code: 'EMAIL_ALREADY_USED', message: 'Bu e-posta zaten kayıtlı' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const name = `${dto.firstName} ${dto.lastName}`;

    let targetDepartment = dto.department;
    if (actor?.role === 'MANAGER' && actor.employeeId) {
      const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
      if (manager) {
        targetDepartment = manager.department ?? undefined;
      }
    }

    return this.prisma.$transaction(async (trx: Prisma.TransactionClient) => {
      const user = await trx.user.create({
        data: {
          email: dto.email,
          name,
          passwordHash,
          role: dto.role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE'
        }
      });

      return trx.employee.create({
        data: {
          userId: user.id,
          position: dto.position,
          department: targetDepartment ?? undefined,
          phone: dto.phone,
          hourlyRate: dto.hourlyRate,
          maxWeeklyHours: dto.maxWeeklyHours ?? 45
        },
        include: { user: { select: USER_SAFE_SELECT } }
      });
    });
  }

  async update(id: string, dto: UpdateEmployeeDto, actor?: { role: string; employeeId?: string }) {
    await this.getById(id, actor);

    return this.prisma.employee.update({
      where: { id },
      data: {
        position: dto.position,
        department: dto.department,
        phone: dto.phone,
        hourlyRate: dto.hourlyRate,
        maxWeeklyHours: dto.maxWeeklyHours,
        isActive: dto.isActive
      },
      include: { user: { select: USER_SAFE_SELECT } }
    });
  }

  async remove(id: string, actor?: { role: string; employeeId?: string }) {
    await this.getById(id, actor);

    await this.prisma.employee.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });

    return { message: 'Çalışan arşivlendi' };
  }
}
