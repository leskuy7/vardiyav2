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
