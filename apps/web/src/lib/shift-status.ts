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
