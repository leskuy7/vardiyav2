import { notifications } from '@mantine/notifications';
import axios from 'axios';

export function showMutationError(error: unknown, fallback = 'İşlem başarısız oldu.') {
  const message = axios.isAxiosError(error)
    ? error.response?.data?.message ?? fallback
    : fallback;
  notifications.show({ title: 'Hata', message, color: 'red' });
}
