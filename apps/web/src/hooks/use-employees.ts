"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

const LONG_STALE_TIME = 5 * 60 * 1000;

export type EmployeeItem = {
  id: string;
  user: { id: string; name: string; email: string };
  department?: string | null;
  position?: string | null;
  phone?: string | null;
  hourlyRate?: number | null;
  maxWeeklyHours: number;
  isActive: boolean;
};

export function useEmployees(active = true) {
  return useQuery({
    queryKey: ["employees", active],
    staleTime: LONG_STALE_TIME,
    queryFn: async () => {
      const response = await api.get<EmployeeItem[]>(
        `/employees?active=${active}`,
      );
      return response.data;
    },
  });
}

export function useMetaDepartments() {
  return useQuery({
    queryKey: ["meta", "departments"],
    staleTime: LONG_STALE_TIME,
    queryFn: async () => {
      const response = await api.get<string[]>("/meta/departments");
      const defaults = ["Mutfak", "Servis", "Yönetim", "Temizlik"];
      return Array.from(new Set([...defaults, ...(response.data ?? [])])).sort(
        (a, b) => a.localeCompare(b, "tr"),
      );
    },
  });
}

export function useMetaPositions() {
  return useQuery({
    queryKey: ["meta", "positions"],
    staleTime: LONG_STALE_TIME,
    queryFn: async () => {
      const response = await api.get<string[]>("/meta/positions");
      const defaults = ["Aşçı", "Garson", "Komi", "Barmen", "Müdür", "Kasiyer"];
      return Array.from(new Set([...defaults, ...(response.data ?? [])])).sort(
        (a, b) => a.localeCompare(b, "tr"),
      );
    },
  });
}

type CreateEmployeePayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: "MANAGER" | "EMPLOYEE";
  position?: string;
  department?: string;
  phone?: string;
  hourlyRate?: number;
  maxWeeklyHours?: number;
};

type UpdateEmployeePayload = {
  id: string;
  position?: string;
  department?: string;
  phone?: string;
  hourlyRate?: number;
  maxWeeklyHours?: number;
  isActive?: boolean;
};

export function useEmployeeActions() {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["employees"] }),
      queryClient.invalidateQueries({ queryKey: ["meta", "departments"] }),
      queryClient.invalidateQueries({ queryKey: ["meta", "positions"] }),
    ]);
  };

  const createEmployee = useMutation({
    mutationFn: async (payload: CreateEmployeePayload) => {
      const response = await api.post("/employees", payload);
      return response.data as EmployeeItem;
    },
    onSuccess: invalidate,
  });

  const updateEmployee = useMutation({
    mutationFn: async (payload: UpdateEmployeePayload) => {
      const { id, ...data } = payload;
      const response = await api.patch(`/employees/${id}`, data);
      return response.data as EmployeeItem;
    },
    onSuccess: invalidate,
  });

  const archiveEmployee = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/employees/${id}`);
      return response.data as { message: string };
    },
    onSuccess: invalidate,
  });

  const bulkClearField = useMutation({
    mutationFn: async ({
      field,
      value,
      employeeIds,
    }: {
      field: "department" | "position";
      value: string;
      employeeIds: string[];
    }) => {
      await Promise.all(
        employeeIds.map((id) => api.patch(`/employees/${id}`, { [field]: "" })),
      );
      return { field, value, count: employeeIds.length };
    },
    onSuccess: invalidate,
  });

  return { createEmployee, updateEmployee, archiveEmployee, bulkClearField };
}
