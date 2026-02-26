import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  async list(active?: boolean) {
    return this.prisma.employee.findMany({
      where: {
        isActive: active,
        deletedAt: null
      },
      include: { user: { select: USER_SAFE_SELECT } },
      orderBy: [{ createdAt: 'desc' }]
    });
  }

  async getById(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: USER_SAFE_SELECT } }
    });

    if (!employee) {
      throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Çalışan bulunamadı' });
    }

    return employee;
  }

  async create(dto: CreateEmployeeDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException({ code: 'EMAIL_ALREADY_USED', message: 'Bu e-posta zaten kayıtlı' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const name = `${dto.firstName} ${dto.lastName}`;

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
          department: dto.department,
          phone: dto.phone,
          hourlyRate: dto.hourlyRate,
          maxWeeklyHours: dto.maxWeeklyHours ?? 45
        },
        include: { user: { select: USER_SAFE_SELECT } }
      });
    });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.getById(id);

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

  async remove(id: string) {
    await this.getById(id);

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
