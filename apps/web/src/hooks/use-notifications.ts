import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type Notification = {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    actionUrl?: string | null;
    createdAt: string;
};

export function useNotifications(userId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['notifications', userId];

  const { data, isLoading } = useQuery<{ items: Notification[]; unreadCount: number }>({
    queryKey,
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data;
    },
    refetchInterval: 30000,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    notifications: data?.items ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}
