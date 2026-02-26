import { IconBan, IconCheck, IconClockHour4, IconSpeakerphone } from '@tabler/icons-react';

export type ShiftStatus = 'DRAFT' | 'PUBLISHED' | 'ACKNOWLEDGED' | 'CANCELLED' | string;

export const SHIFT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Taslak',
  PUBLISHED: 'Yayınlandı',
  ACKNOWLEDGED: 'Onaylandı',
  CANCELLED: 'İptal'
};

export const SHIFT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'gray',
  PUBLISHED: 'blue',
  ACKNOWLEDGED: 'teal',
  CANCELLED: 'red'
};

export function getShiftStatusLabel(status: ShiftStatus) {
  return SHIFT_STATUS_LABELS[status] ?? status;
}

export function getShiftStatusColor(status: ShiftStatus) {
  return SHIFT_STATUS_COLORS[status] ?? 'gray';
}

export function getShiftStatusIcon(status: ShiftStatus) {
  switch (status) {
    case 'DRAFT':
      return IconClockHour4;
    case 'PUBLISHED':
      return IconSpeakerphone;
    case 'ACKNOWLEDGED':
      return IconCheck;
    case 'CANCELLED':
      return IconBan;
    default:
      return IconClockHour4;
  }
}
