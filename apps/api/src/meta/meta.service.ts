import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MetaService {
  constructor(private readonly prisma: PrismaService) {}

  async departments() {
    const rows = await this.prisma.employee.findMany({
      where: { deletedAt: null, department: { not: null } },
      select: { department: true },
      distinct: ['department']
    });

    return rows
      .map((row) => row.department?.trim() ?? '')
      .filter((value) => value.length > 0)
      .sort((left, right) => left.localeCompare(right, 'tr'));
  }

  async positions() {
    const rows = await this.prisma.employee.findMany({
      where: { deletedAt: null, position: { not: null } },
      select: { position: true },
      distinct: ['position']
    });

    return rows
      .map((row) => row.position?.trim() ?? '')
      .filter((value) => value.length > 0)
      .sort((left, right) => left.localeCompare(right, 'tr'));
  }
}
