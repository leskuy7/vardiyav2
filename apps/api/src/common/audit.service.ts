import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type AuditPayload = {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: unknown;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(payload: AuditPayload) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: payload.userId,
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId,
          details: payload.details as Prisma.InputJsonValue | undefined
        }
      });
    } catch (error) {
      this.logger.error('Audit log write failed', error instanceof Error ? error.stack : String(error));
    }
  }
}
