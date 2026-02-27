import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(private readonly prisma: PrismaService) {}

  private toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === null) {
      return 'null';
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toInputJsonValue(item));
    }

    if (typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(objectValue).map(([key, item]) => [key, this.toInputJsonValue(item)])
      );
    }

    return String(value);
  }

  async ingestCspReport(report: unknown, sourceIp?: string) {
    const adminUser = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true }
    });

    if (!adminUser) {
      this.logger.warn('CSP report ignored because no admin user exists yet');
      return;
    }

    await this.prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'SECURITY_CSP_REPORT',
        entityType: 'SECURITY',
        entityId: 'csp-report',
        details: this.toInputJsonValue({
          sourceIp: sourceIp ?? null,
          report
        })
      }
    });
  }
}
