"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { PrintFormResponse } from "../lib/print-form";

export function useSchedulePrintForm(weekStart: string, department: string, enabled: boolean) {
  return useQuery({
    queryKey: ["schedule", "print-form", weekStart, department],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({ start: weekStart });
      if (department && department !== "all") {
        params.set("department", department);
      }
      const response = await api.get<PrintFormResponse>(`/schedule/print-form?${params.toString()}`);
      return response.data;
    },
  });
}
