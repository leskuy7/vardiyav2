"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type Shift = {
  id: string;
  employeeId: string;
  employeeName?: string;
  start: string;
  end: string;
  startTime?: string;
  endTime?: string;
  status: string;
  note?: string;
  warnings?: string[];
  swapRequests?: Array<{ id: string; requesterId: string; targetEmployeeId: string | null; status: string }>;
};

export type WeeklySchedule = {
  start: string;
  end: string;
  days: Array<{ date: string; shifts: Shift[] }>;
};

export function useWeeklySchedule(weekStart: string) {
  return useQuery({
    queryKey: ['schedule', weekStart],
    queryFn: async () => {
      const response = await api.get<WeeklySchedule>(`/schedule/week?start=${weekStart}`);
      return response.data;
    }
  });
}

export function useShiftsActions(weekStart: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['schedule', weekStart] });
    queryClient.invalidateQueries({ queryKey: ['my-shifts'] });
  };

  const createShift = useMutation({
    mutationFn: async (payload: { employeeId: string; startTime: string; endTime: string; note?: string; forceOverride?: boolean }) => {
      const response = await api.post('/shifts', payload);
      return response.data as Shift;
    },
    onSuccess: invalidate
  });

  const updateShift = useMutation({
    mutationFn: async (payload: { id: string; employeeId: string; startTime: string; endTime: string; note?: string; forceOverride?: boolean }) => {
      const response = await api.patch(`/shifts/${payload.id}`, payload);
      return response.data as Shift;
    },
    onSuccess: invalidate
  });

  const acknowledgeShift = useMutation({
    mutationFn: async (shiftId: string) => {
      const response = await api.post(`/shifts/${shiftId}/acknowledge`);
      return response.data as Shift;
    },
    onSuccess: invalidate
  });

  const deleteShift = useMutation({
    mutationFn: async (shiftId: string) => {
      const response = await api.patch(`/shifts/${shiftId}/cancel`);
      return response.data as { message: string };
    },
    onSuccess: invalidate
  });

  const deleteShiftLegacy = useMutation({
    mutationFn: async (shiftId: string) => {
      const response = await api.delete(`/shifts/${shiftId}`);
      return response.data as { message: string };
    },
    onSuccess: invalidate
  });

  const declineShift = useMutation({
    mutationFn: async (payload: { shiftId: string; reason: string }) => {
      const response = await api.post(`/shifts/${payload.shiftId}/decline`, { reason: payload.reason });
      return response.data as Shift;
    },
    onSuccess: invalidate
  });

  return { createShift, updateShift, acknowledgeShift, deleteShift, deleteShiftLegacy, declineShift };
}
