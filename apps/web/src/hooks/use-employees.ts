"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { showMutationError } from "../lib/mutation-error";

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
      return (response.data ?? []).sort((a, b) => a.localeCompare(b, "tr"));
    },
  });
}

export function useMetaPositions() {
  return useQuery({
    queryKey: ["meta", "positions"],
    staleTime: LONG_STALE_TIME,
    queryFn: async () => {
      const response = await api.get<string[]>("/meta/positions");
      return (response.data ?? []).sort((a, b) => a.localeCompare(b, "tr"));
    },
  });
}

export type CreateEmployeePayload = {
  email?: string;
  password?: string;
  firstName: string;
  lastName: string;
  role?: "MANAGER" | "EMPLOYEE";
  position?: string;
  department?: string;
  phone?: string;
  hourlyRate?: number;
  maxWeeklyHours?: number;
};

export type CreateEmployeeResult =
  | EmployeeItem
  | { employee: EmployeeItem; generatedEmail: string; generatedPassword: string };

type UpdateEmployeePayload = {
  id: string;
  firstName?: string;
  lastName?: string;
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
      return response.data as CreateEmployeeResult;
    },
    onSuccess: invalidate,
    onError: (error) => showMutationError(error, 'Çalışan oluşturulamadı.'),
  });

  const updateEmployee = useMutation({
    mutationFn: async (payload: UpdateEmployeePayload) => {
      const { id, ...data } = payload;
      const response = await api.patch(`/employees/${id}`, data);
      return response.data as EmployeeItem;
    },
    onSuccess: invalidate,
    onError: (error) => showMutationError(error, 'Çalışan güncellenemedi.'),
  });

  const archiveEmployee = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/employees/${id}`);
      return response.data as { message: string };
    },
    onSuccess: invalidate,
    onError: (error) => showMutationError(error, 'Çalışan arşivlenemedi.'),
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
      const patch = { [field]: value };
      await api.post("/employees/bulk-update", { employeeIds, patch });
      return { field, value, count: employeeIds.length };
    },
    onSuccess: invalidate,
    onError: (error) => showMutationError(error, 'Toplu güncelleme başarısız oldu.'),
  });

  return { createEmployee, updateEmployee, archiveEmployee, bulkClearField };
}
