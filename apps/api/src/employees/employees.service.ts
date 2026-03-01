import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { decryptPassword, encryptPassword } from '../common/credential-cipher';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  private getEncryptionSecret(): string {
    return this.config.get<string>('ENCRYPTION_KEY') ?? this.config.get<string>('JWT_ACCESS_SECRET') ?? '';
  }

  async list(active?: boolean, actor?: { role: string; sub?: string; employeeId?: string }) {
    const where: Prisma.EmployeeWhereInput = {
      isActive: active,
      deletedAt: null
    };

    if (actor?.role === 'ADMIN' && actor.sub) {
      const org = await this.prisma.organization.findUnique({ where: { adminUserId: actor.sub } });
      if (org) {
        where.organizationId = org.id;
      }
    }

    if (actor?.role === 'MANAGER' && actor.employeeId) {
      const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
      if (manager) {
        where.department = manager.department;
        if (manager.organizationId) {
          where.organizationId = manager.organizationId;
        }
      }
    }

    return this.prisma.employee.findMany({
      where,
      include: { user: { select: USER_SAFE_SELECT } },
      orderBy: [{ createdAt: 'desc' }]
    });
  }

  async getById(id: string, actor?: { role: string; sub?: string; employeeId?: string }) {
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

  async create(
    dto: CreateEmployeeDto,
    actor?: { role: string; sub?: string; employeeId?: string }
  ): Promise<
    | { employee: Awaited<ReturnType<Prisma.TransactionClient['employee']['create']>> }
    | { employee: Awaited<ReturnType<Prisma.TransactionClient['employee']['create']>>; generatedEmail: string; generatedPassword: string }
  > {
    const useGenerated = !dto.email || !dto.password;
    let email: string;
    let password: string;
    let storeInVault = false;

    if (useGenerated) {
      if (dto.email || dto.password) {
        throw new BadRequestException({
          code: 'CREDENTIAL_MODE',
          message: 'E-posta ve şifre birlikte verilmeli veya ikisi de boş bırakılmalı (otomatik üretim).'
        });
      }
      email = await this.generateUniqueLogin();
      password = this.generateTempPassword();
      storeInVault = true;
    } else {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email! } });
      if (existing) {
        throw new BadRequestException({ code: 'EMAIL_ALREADY_USED', message: 'Bu e-posta zaten kayıtlı' });
      }
      email = dto.email!;
      password = dto.password!;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const name = `${dto.firstName} ${dto.lastName}`.trim() || 'Çalışan';

    let targetDepartment = dto.department;
    let targetRole = dto.role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE';
    let organizationId: string | undefined;

    if (actor?.role === 'ADMIN' && actor.sub) {
      const org = await this.prisma.organization.findUnique({ where: { adminUserId: actor.sub } });
      organizationId = org?.id;
    }
    if (actor?.role === 'MANAGER' && actor.employeeId) {
      const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
      if (manager) {
        targetDepartment = manager.department ?? undefined;
        organizationId = manager.organizationId ?? undefined;
      }
      targetRole = 'EMPLOYEE';
    }

    const result = await this.prisma.$transaction(async (trx: Prisma.TransactionClient) => {
      const user = await trx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: targetRole as 'MANAGER' | 'EMPLOYEE'
        }
      });

      const employee = await trx.employee.create({
        data: {
          userId: user.id,
          organizationId: organizationId ?? null,
          position: dto.position,
          department: targetDepartment ?? undefined,
          phone: dto.phone,
          hourlyRate: dto.hourlyRate,
          maxWeeklyHours: dto.maxWeeklyHours ?? 45
        },
        include: { user: { select: USER_SAFE_SELECT } }
      });

      if (storeInVault) {
        const secret = this.getEncryptionSecret();
        if (secret) {
          await (trx as any).userCredentialVault.create({
            data: {
              userId: user.id,
              encryptedPassword: encryptPassword(password, secret)
            }
          });
        }
      }

      return employee;
    });

    if (useGenerated) {
      return { employee: result, generatedEmail: email, generatedPassword: password };
    }
    return { employee: result };
  }

  async getCredentials(
    employeeId: string,
    actor?: { role: string; sub?: string; employeeId?: string }
  ): Promise<{ email: string; password: string } | null> {
    await this.getById(employeeId, actor);
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true }
    });
    if (!employee) return null;

    const vault = await this.prisma.userCredentialVault.findUnique({
      where: { userId: employee.userId }
    });
    if (!vault) return null;

    const secret = this.getEncryptionSecret();
    if (!secret) return null;

    if (actor?.role === 'ADMIN') {
      return {
        email: employee.user.email,
        password: decryptPassword(vault.encryptedPassword, secret)
      };
    }

    if (actor?.role === 'MANAGER') {
      if (vault.seenByManagerAt) return null;
      await this.prisma.userCredentialVault.update({
        where: { userId: employee.userId },
        data: { seenByManagerAt: new Date() }
      });
      return {
        email: employee.user.email,
        password: decryptPassword(vault.encryptedPassword, secret)
      };
    }

    return null;
  }

  private async generateUniqueLogin(): Promise<string> {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    for (let attempt = 0; attempt < 50; attempt++) {
      let login = '';
      for (let i = 0; i < 6; i++) {
        login += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.prisma.user.findUnique({ where: { email: login } });
      if (!existing) return login;
    }
    throw new Error('Could not generate unique login');
  }

  private generateTempPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%&*';
    let p = '';
    p += upper.charAt(Math.floor(Math.random() * upper.length));
    p += lower.charAt(Math.floor(Math.random() * lower.length));
    p += digits.charAt(Math.floor(Math.random() * digits.length));
    p += special.charAt(Math.floor(Math.random() * special.length));
    for (let i = 0; i < 8; i++) {
      const pool = upper + lower + digits + special;
      p += pool.charAt(Math.floor(Math.random() * pool.length));
    }
    return p
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  async update(id: string, dto: UpdateEmployeeDto, actor?: { role: string; sub?: string; employeeId?: string }) {
    await this.getById(id, actor);

    let targetDepartment = dto.department;
    if (actor?.role === 'MANAGER' && actor.employeeId) {
      const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
      if (manager) {
        targetDepartment = manager.department ?? undefined;
      }
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        position: dto.position,
        department: targetDepartment,
        phone: dto.phone,
        hourlyRate: dto.hourlyRate,
        maxWeeklyHours: dto.maxWeeklyHours,
        isActive: dto.isActive
      },
      include: { user: { select: USER_SAFE_SELECT } }
    });
  }

  async remove(id: string, actor?: { role: string; sub?: string; employeeId?: string }) {
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
