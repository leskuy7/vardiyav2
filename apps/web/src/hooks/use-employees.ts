"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

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
    queryKey: ['employees', active],
    queryFn: async () => {
      const response = await api.get<EmployeeItem[]>(`/employees?active=${active}`);
      return response.data;
    }
  });
}

type CreateEmployeePayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'MANAGER' | 'EMPLOYEE';
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
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['employees'] });

  const createEmployee = useMutation({
    mutationFn: async (payload: CreateEmployeePayload) => {
      const response = await api.post('/employees', payload);
      return response.data as EmployeeItem;
    },
    onSuccess: invalidate
  });

  const updateEmployee = useMutation({
    mutationFn: async (payload: UpdateEmployeePayload) => {
      const { id, ...data } = payload;
      const response = await api.patch(`/employees/${id}`, data);
      return response.data as EmployeeItem;
    },
    onSuccess: invalidate
  });

  const archiveEmployee = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/employees/${id}`);
      return response.data as { message: string };
    },
    onSuccess: invalidate
  });

  return { createEmployee, updateEmployee, archiveEmployee };
}
