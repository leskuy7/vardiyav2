"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const AVAILABILITY_STALE_TIME = 2 * 60 * 1000;

export type AvailabilityType = 'UNAVAILABLE' | 'PREFER_NOT' | 'AVAILABLE_ONLY';

export type AvailabilityItem = {
  id: string;
  employeeId: string;
  type: AvailabilityType;
  dayOfWeek: number;
  startTime?: string | null;
  endTime?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  note?: string | null;
};

export type CreateAvailabilityPayload = {
  employeeId: string;
  type: AvailabilityType;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  note?: string;
};

export function useAvailability(employeeId?: string) {
  return useQuery({
    queryKey: ['availability', employeeId ?? 'all'],
    staleTime: AVAILABILITY_STALE_TIME,
    queryFn: async () => {
      const query = employeeId ? `?employeeId=${employeeId}` : '';
      const response = await api.get<AvailabilityItem[]>(`/availability${query}`);
      return response.data;
    }
  });
}

export function useAvailabilityActions(employeeId?: string) {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['availability', employeeId ?? 'all'] });

  const createAvailability = useMutation({
    mutationFn: async (payload: CreateAvailabilityPayload) => {
      const response = await api.post('/availability', payload);
      return response.data as AvailabilityItem;
    },
    onSuccess: invalidate
  });

  const deleteAvailability = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/availability/${id}`);
      return response.data as { message: string };
    },
    onSuccess: invalidate
  });

  return { createAvailability, deleteAvailability };
}
