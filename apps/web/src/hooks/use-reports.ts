"use client";

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

type WeeklyReport = {
  weekStart: string;
  weekEnd: string;
  employees: Array<{ employeeId: string; employeeName: string; hours: number; overtimeHours: number; cost: number }>;
  totals: { hours: number; overtimeHours: number; cost: number };
};

export function useWeeklyReport(weekStart: string) {
  return useQuery({
    queryKey: ['reports', 'weekly', weekStart],
    queryFn: async () => {
      const response = await api.get<WeeklyReport>(`/reports/weekly-hours?weekStart=${weekStart}`);
      return response.data;
    }
  });
}

export type SecurityEvent = {
  id: string;
  createdAt: string;
  sourceIp: string | null;
  documentUri: string | null;
  violatedDirective: string | null;
  blockedUri: string | null;
  effectiveDirective: string | null;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
};

export type ComplianceViolation = {
  employeeId: string;
  employeeName: string;
  maxHoursViolation?: number;
  no24hRest: boolean;
};

export type ComplianceViolationsReport = {
  weekStart: string;
  weekEnd: string;
  violations: ComplianceViolation[];
};

export type AuditTrailEvent = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: "ROOT" | "ADMIN" | "MANAGER" | "EMPLOYEE";
  };
  details: Record<string, unknown>;
};

export function useComplianceViolations(weekStart: string) {
  return useQuery({
    queryKey: ['reports', 'compliance-violations', weekStart],
    queryFn: async () => {
      const response = await api.get<ComplianceViolationsReport>(
        `/reports/compliance-violations?weekStart=${weekStart}`
      );
      return response.data;
    }
  });
}

export function useSecurityEvents(
  enabled: boolean,
  filters?: { limit?: number; directive?: string; from?: string; to?: string }
) {
  const limit = filters?.limit ?? 50;
  const directive = filters?.directive ?? '';
  const from = filters?.from ?? '';
  const to = filters?.to ?? '';

  return useQuery({
    queryKey: ['reports', 'security-events', limit, directive, from, to],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (directive.trim()) params.set('directive', directive.trim());
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const response = await api.get<SecurityEvent[]>(`/reports/security-events?${params.toString()}`);
      return response.data;
    }
  });
}

export function useAuditTrail(
  enabled: boolean,
  filters?: { limit?: number; action?: string; entityType?: string; userId?: string; from?: string; to?: string }
) {
  const limit = filters?.limit ?? 100;
  const action = filters?.action ?? "";
  const entityType = filters?.entityType ?? "";
  const userId = filters?.userId ?? "";
  const from = filters?.from ?? "";
  const to = filters?.to ?? "";

  return useQuery({
    queryKey: ["reports", "audit-trail", limit, action, entityType, userId, from, to],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (action.trim()) params.set("action", action.trim());
      if (entityType.trim()) params.set("entityType", entityType.trim());
      if (userId.trim()) params.set("userId", userId.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await api.get<AuditTrailEvent[]>(`/reports/audit-trail?${params.toString()}`);
      return response.data;
    }
  });
}
