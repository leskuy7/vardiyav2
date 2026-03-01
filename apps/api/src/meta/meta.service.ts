import { ForbiddenException, Injectable } from '@nestjs/common';
import { SuggestionKind } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type Actor = { role: string; sub?: string; employeeId?: string };

@Injectable()
export class MetaService {
  constructor(private readonly prisma: PrismaService) {}

  async getActorOrganizationId(actor?: Actor): Promise<string | null> {
    if (!actor) return null;
    if (actor.role === 'ADMIN' && actor.sub) {
      const org = await this.prisma.organization.findUnique({
        where: { adminUserId: actor.sub }
      });
      return org?.id ?? null;
    }
    if (actor.role === 'MANAGER' && actor.employeeId) {
      const emp = await this.prisma.employee.findUnique({
        where: { id: actor.employeeId },
        select: { organizationId: true }
      });
      return emp?.organizationId ?? null;
    }
    return null;
  }

  async getSuggestions(kind: SuggestionKind, actor?: Actor): Promise<string[]> {
    const organizationId = await this.getActorOrganizationId(actor);
    const field = kind === 'DEPARTMENT' ? 'department' : 'position';

    const fromTemplate: string[] = [];
    const fromOrg: string[] = [];
    if (organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: { businessType: { include: { businessTemplates: true } }, orgSuggestions: true }
      });
      if (org) {
        fromTemplate.push(
          ...org.businessType.businessTemplates
            .filter((t) => t.kind === kind)
            .map((t) => t.value)
        );
        fromOrg.push(...org.orgSuggestions.filter((s) => s.kind === kind).map((s) => s.value));
      }
    }

    const fromEmployees = await this.prisma.employee.findMany({
      where: {
        deletedAt: null,
        ...(organizationId ? { organizationId } : {}),
        [field]: { not: null }
      },
      select: field === 'department' ? { department: true } : { position: true },
      distinct: [field]
    });
    const employeeValues = fromEmployees
      .map((r: { department?: string | null; position?: string | null }) =>
        (r.department ?? r.position)?.trim()
      )
      .filter((v): v is string => !!v && v.length > 0);

    const combined = Array.from(
      new Set([...fromTemplate, ...fromOrg, ...employeeValues])
    ).sort((a, b) => a.localeCompare(b, 'tr'));
    return combined;
  }

  async listSuggestionsWithIds(
    kind: SuggestionKind,
    actor?: Actor
  ): Promise<{ value: string; id?: string }[]> {
    const organizationId = await this.getActorOrganizationId(actor);
    const values = await this.getSuggestions(kind, actor);
    if (!organizationId) {
      return values.map((v) => ({ value: v }));
    }
    const orgSuggestions = await this.prisma.orgSuggestion.findMany({
      where: { organizationId, kind }
    });
    const byValue = new Map(orgSuggestions.map((s) => [s.value, s.id]));
    return values.map((v) => ({ value: v, id: byValue.get(v) }));
  }

  async addSuggestion(kind: SuggestionKind, value: string, actor?: Actor): Promise<void> {
    const organizationId = await this.getActorOrganizationId(actor);
    if (!organizationId || actor?.role !== 'ADMIN') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only admin can add suggestions' });
    }
    const trimmed = value?.trim();
    if (!trimmed) return;
    await this.prisma.orgSuggestion.upsert({
      where: {
        organizationId_kind_value: { organizationId, kind, value: trimmed }
      },
      create: { organizationId, kind, value: trimmed },
      update: {}
    });
  }

  async removeSuggestion(id: string, actor?: Actor): Promise<void> {
    if (actor?.role !== 'ADMIN') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only admin can remove suggestions' });
    }
    const organizationId = await this.getActorOrganizationId(actor);
    const suggestion = await this.prisma.orgSuggestion.findFirst({
      where: { id, organizationId: organizationId ?? undefined }
    });
    if (!suggestion) {
      throw new ForbiddenException({ code: 'NOT_FOUND', message: 'Suggestion not found' });
    }
    await this.prisma.orgSuggestion.delete({ where: { id } });
  }

  async departments(actor?: Actor) {
    return this.getSuggestions('DEPARTMENT', actor);
  }

  async positions(actor?: Actor) {
    return this.getSuggestions('POSITION', actor);
  }
}
