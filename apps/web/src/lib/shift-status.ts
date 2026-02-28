import { IconBan, IconCheck, IconClockHour4, IconExchange, IconQuestionMark, IconSpeakerphone, IconX } from '@tabler/icons-react';

export type ShiftStatus = 'PROPOSED' | 'DRAFT' | 'PUBLISHED' | 'ACKNOWLEDGED' | 'DECLINED' | 'SWAPPED' | 'CANCELLED' | string;

export const SHIFT_STATUS_LABELS: Record<string, string> = {
  PROPOSED: 'Öneri',
  DRAFT: 'Taslak',
  PUBLISHED: 'Onay Bekliyor',
  ACKNOWLEDGED: 'Onaylandı',
  DECLINED: 'Reddedildi',
  SWAPPED: 'Takas Edildi',
  CANCELLED: 'İptal'
};

export const SHIFT_STATUS_COLORS: Record<string, string> = {
  PROPOSED: 'violet',
  DRAFT: 'gray',
  PUBLISHED: 'blue',
  ACKNOWLEDGED: 'teal',
  DECLINED: 'red',
  SWAPPED: 'orange',
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
    case 'PROPOSED':
      return IconQuestionMark;
    case 'DRAFT':
      return IconClockHour4;
    case 'PUBLISHED':
      return IconSpeakerphone;
    case 'ACKNOWLEDGED':
      return IconCheck;
    case 'DECLINED':
      return IconX;
    case 'SWAPPED':
      return IconExchange;
    case 'CANCELLED':
      return IconBan;
    default:
      return IconClockHour4;
  }
}
