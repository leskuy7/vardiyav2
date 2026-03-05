"use client";

import { Alert, Button, Checkbox, Group, Modal, Select, Stack, Switch, TextInput, Text, ThemeIcon } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { IconHistory } from '@tabler/icons-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { AvailabilityItem } from '../../hooks/use-availability';
import { getAvailabilityConflicts } from '../../lib/availability-conflicts';
import { formatDateShort, formatTimeOnly } from '../../lib/time';
import { api } from '../../lib/api';

type EmployeeOption = { value: string; label: string };

type ShiftModalProps = {
  opened: boolean;
  onClose: () => void;
  onSubmit: (payload: { employeeId: string; startTime: string; endTime: string; note?: string; forceOverride?: boolean }) => Promise<void>;
  onDelete?: () => Promise<void>;
  employeeId: string;
  employees?: EmployeeOption[];
  availabilityList?: AvailabilityItem[];
  initial?: {
    start: string;
    end: string;
    note?: string;
    swapRequests?: Array<{ id: string; requesterId: string; targetEmployeeId: string | null; status: string }>;
  };
};

const SHIFT_TEMPLATES = [
  { label: 'Sabah (06:00-14:00)', startHour: 6, endHour: 14 },
  { label: 'Öğle (14:00-22:00)', startHour: 14, endHour: 22 },
  { label: 'Gece (22:00-06:00)', startHour: 22, endHour: 30 }
];

function conflictCodeToMessage(code: string): string {
  const map: Record<string, string> = {
    UNAVAILABLE_CONFLICT: 'Çalışan bu saatte müsait değil (UNAVAILABLE).',
    PREFER_NOT_CONFLICT: 'Çalışan bu saatte tercihen çalışmak istemiyor (PREFER_NOT).',
    AVAILABLE_ONLY_CONFLICT: 'Vardiya, çalışanın müsait olduğu saatler dışına taşıyor.',
    COMPLIANCE_VIOLATION: 'Vardiya uyumluluk kuralını ihlal ediyor.',
    COMPLIANCE_MAX_HOURS: 'Haftalık yasal çalışma süresi aşılıyor.',
    COMPLIANCE_NO_REST: '24 saatlik kesintisiz hafta tatili sağlanamıyor.',
    SHIFT_OVERLAP: 'Bu vardiya, aynı çalışanın mevcut bir vardiyasıyla çakışıyor.',
    LEAVE_OVERLAP: 'Personel belirtilen tarihlerde onaylı izinde.',
    INVALID_TIME_RANGE: 'Başlangıç zamanı, bitiş zamanından önce olmalıdır.',
    FORBIDDEN: 'Bu işlem için yetkiniz bulunmuyor.',
  };
  return map[code] ?? `Hata: ${code}`;
}

function applyTemplate(baseDate: Date, startHour: number, endHour: number) {
  const dayStart = new Date(baseDate);
  dayStart.setHours(0, 0, 0, 0);

  const startAt = new Date(dayStart);
  startAt.setHours(startHour, 0, 0, 0);

  const endAt = new Date(dayStart);
  endAt.setHours(endHour, 0, 0, 0);

  return { startAt, endAt };
}

export function ShiftModal({ opened, onClose, onSubmit, onDelete, employeeId, employees, availabilityList, initial }: ShiftModalProps) {
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [note, setNote] = useState('');
  const [forceOverride, setForceOverride] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retroactive, setRetroactive] = useState(false);

  // Client-side overlap check state
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [checkingOverlap, setCheckingOverlap] = useState(false);

  const isEdit = Boolean(initial);

  const availabilityConflicts = useMemo(
    () => getAvailabilityConflicts(availabilityList, selectedEmployeeId, startAt, endAt),
    [availabilityList, selectedEmployeeId, startAt, endAt]
  );

  useEffect(() => {
    if (!opened) return;
  }, [opened, availabilityConflicts.length, forceOverride, selectedEmployeeId]);

  useEffect(() => {
    setStartAt(initial?.start ? new Date(initial.start) : null);
    setEndAt(initial?.end ? new Date(initial.end) : null);
    setNote(initial?.note ?? '');
    setForceOverride(false);
    setError(null);
    setOverlapWarning(null);
    setSelectedEmployeeId(employeeId);
    setRetroactive(false);
  }, [employeeId, initial, opened]);

  // Client-side overlap check — fires when employee, start, or end changes
  useEffect(() => {
    if (!selectedEmployeeId || !startAt || !endAt || startAt >= endAt) {
      setOverlapWarning(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCheckingOverlap(true);
      try {
        const { data: shifts } = await api.get(`/shifts?employeeId=${selectedEmployeeId}&status=PUBLISHED,ACKNOWLEDGED,PROPOSED`, {
          signal: controller.signal,
        });
        const existingShifts = Array.isArray(shifts) ? shifts : [];
        const conflicting = existingShifts.find((s: { id: string; startTime: string; endTime: string; status: string }) => {
          if (initial && s.startTime === initial.start && s.endTime === initial.end) return false; // skip self
          const sStart = new Date(s.startTime).getTime();
          const sEnd = new Date(s.endTime).getTime();
          return startAt.getTime() < sEnd && endAt.getTime() > sStart;
        });
        if (conflicting) {
          const cs = new Date(conflicting.startTime);
          const ce = new Date(conflicting.endTime);
          setOverlapWarning(
            `⚠️ Çakışma tespit edildi! Bu çalışanın ${formatDateShort(cs.toISOString())} ${formatTimeOnly(cs.toISOString())} – ${formatTimeOnly(ce.toISOString())} arasında zaten bir vardiyası var.`
          );
        } else {
          setOverlapWarning(null);
        }
      } catch {
        // Network error — don't block the user
      } finally {
        setCheckingOverlap(false);
      }
    }, 400); // debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedEmployeeId, startAt, endAt, initial]);

  // Past date warning
  const isPastDate = useMemo(() => {
    if (!startAt) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return startAt < now;
  }, [startAt]);

  const selectedDate = useMemo(() => startAt ?? endAt ?? new Date(), [startAt, endAt]);

  // MinDate for DateTimePicker (null = no limit for retroactive mode)
  const minDate = retroactive ? undefined : new Date();

  function handleTemplateClick(startHour: number, endHour: number) {
    const { startAt: nextStart, endAt: nextEnd } = applyTemplate(selectedDate, startHour, endHour);
    setStartAt(nextStart);
    setEndAt(nextEnd);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedEmployeeId) {
      setError('Çalışan seçmelisin.');
      return;
    }

    if (!startAt || !endAt) {
      setError('Başlangıç ve bitiş zamanı zorunlu.');
      return;
    }

    if (startAt.getTime() >= endAt.getTime()) {
      setError('Bitiş zamanı başlangıçtan sonra olmalı.');
      return;
    }

    // Block past dates if not retroactive
    if (isPastDate && !retroactive && !isEdit) {
      setError('Geçmiş tarihe vardiya eklenemez. Geçmişe dönük eklemek için ilgili seçeneği açın.');
      return;
    }

    // Block if overlap detected (client-side)
    if (overlapWarning) {
      setError('Vardiya çakışması mevcut. Lütfen saatleri düzenleyin veya farklı bir çalışan seçin.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        employeeId: selectedEmployeeId,
        startTime: startAt.toISOString(),
        endTime: endAt.toISOString(),
        note: (retroactive && !isEdit ? `[GEÇMİŞE DÖNÜK] ${note || ''}`.trim() : note) || undefined,
        forceOverride
      });
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string; code?: string } } })?.response?.data;
      const msg = res?.message ?? (res?.code ? conflictCodeToMessage(res.code) : null) ?? 'Vardiya kaydedilemedi. Alanları kontrol edip tekrar dene.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch {
      setError('Vardiya iptal edilemedi.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Vardiya Düzenle' : 'Vardiya Ekle'} size="lg">
      <form onSubmit={handleSubmit}>
        <Stack>
          <Select
            label="Çalışan"
            value={selectedEmployeeId}
            onChange={(value) => setSelectedEmployeeId(value ?? '')}
            data={employees ?? []}
            searchable
            required
          />

          <Group gap="xs" wrap="wrap">
            {SHIFT_TEMPLATES.map((template) => (
              <Button
                key={template.label}
                variant="light"
                size="xs"
                type="button"
                onClick={() => handleTemplateClick(template.startHour, template.endHour)}
              >
                {template.label}
              </Button>
            ))}
          </Group>

          <DateTimePicker
            label="Başlangıç"
            value={startAt}
            onChange={setStartAt}
            required
            data-testid="shift-start"
            minDate={minDate}
          />
          <DateTimePicker
            label="Bitiş"
            value={endAt}
            onChange={setEndAt}
            required
            data-testid="shift-end"
            minDate={minDate}
          />
          <TextInput label="Not" value={note} onChange={(event) => setNote(event.currentTarget.value)} />

          {/* Geriye dönük vardiya modu */}
          {!isEdit && (
            <Switch
              label="Geçmişe dönük vardiya ekle"
              description="Unutulmuş veya düzeltme amaçlı geriye dönük vardiya eklemek için açın."
              checked={retroactive}
              onChange={(event) => setRetroactive(event.currentTarget.checked)}
              color="orange"
              thumbIcon={retroactive ? <IconHistory size={12} /> : undefined}
            />
          )}

          {/* Geçmiş tarih uyarısı */}
          {isPastDate && retroactive && !isEdit && (
            <Alert color="orange" title="Geçmişe Dönük Vardiya" variant="light">
              <Text size="sm">
                Bu vardiya geçmiş bir tarihe ekleniyor. Vardiya notu otomatik olarak [GEÇMİŞE DÖNÜK] etiketiyle işaretlenecektir.
              </Text>
            </Alert>
          )}

          {/* Geçmiş tarih uyarısı - retroactive kapalıyken */}
          {isPastDate && !retroactive && !isEdit && (
            <Alert color="red" title="Geçmiş Tarih" variant="light">
              <Text size="sm">
                Seçilen tarih geçmişte. Geçmişe dönük vardiya eklemek istiyorsanız yukarıdaki &quot;Geçmişe dönük vardiya ekle&quot; seçeneğini açın.
              </Text>
            </Alert>
          )}

          {/* Client-side overlap warning */}
          {overlapWarning && (
            <Alert color="red" title="Vardiya Çakışması" variant="light">
              <Text size="sm">{overlapWarning}</Text>
            </Alert>
          )}

          {availabilityConflicts.length > 0 && (
            <Alert color="orange" title="Müsaitlik çakışması" variant="light">
              <Stack gap="xs">
                {availabilityConflicts.map((c, i) => (
                  <div key={i}>
                    {c.timeRange ? <Text size="sm" fw={600}>Saatler: {c.timeRange}</Text> : null}
                    {c.note ? <Text size="sm" mt={2}>Neden: {c.note}</Text> : <Text size="sm" mt={c.timeRange ? 2 : 0}>{c.label}</Text>}
                  </div>
                ))}
                <Text size="xs" c="dimmed" mt="xs">
                  Yine de bu vardiyayı atamak isterseniz aşağıdaki kutucuğu işaretleyip kaydedebilirsiniz.
                </Text>
                <Checkbox
                  mt="xs"
                  label="Müsaitlik çakışmasını override et"
                  checked={forceOverride}
                  onChange={(event) => setForceOverride(event.currentTarget.checked)}
                />
              </Stack>
            </Alert>
          )}

          {initial?.swapRequests && initial.swapRequests.length > 0 && (
            <Alert color="orange" title="Takas İsteği Bekliyor" variant="light">
              <Text size="sm" mb="sm">
                Bu vardiya için beklemede olan bir takas isteği var.
                {initial.swapRequests[0]?.targetEmployeeId
                  ? ` (Hedef: ${employees?.find(e => e.value === initial.swapRequests![0]?.targetEmployeeId)?.label || initial.swapRequests[0]?.targetEmployeeId})`
                  : ' (Hedef: Herkese Açık)'
                }
              </Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  color="green"
                  onClick={() => {
                    api.post(`/swap-requests/${initial.swapRequests![0]?.id}/approve`).then(() => {
                      import('@mantine/notifications').then(({ notifications }) => {
                        notifications.show({ title: 'Onaylandı', message: 'Takas isteği başarıyla onaylandı.', color: 'green' });
                        onClose();
                      });
                    }).catch((err) => {
                      import('@mantine/notifications').then(({ notifications }) => {
                        notifications.show({ title: 'Hata', message: err?.response?.data?.message || 'Onay başarısız!', color: 'red' });
                      });
                    });
                  }}
                >
                  Takası Onayla
                </Button>
                <Button
                  size="xs"
                  color="red"
                  variant="outline"
                  onClick={() => {
                    api.post(`/swap-requests/${initial.swapRequests![0]?.id}/reject`).then(() => {
                      import('@mantine/notifications').then(({ notifications }) => {
                        notifications.show({ title: 'Reddedildi', message: 'Takas isteği reddedildi.', color: 'orange' });
                        onClose();
                      });
                    }).catch((err) => {
                      import('@mantine/notifications').then(({ notifications }) => {
                        notifications.show({ title: 'Hata', message: err?.response?.data?.message || 'Reddetme başarısız!', color: 'red' });
                      });
                    });
                  }}
                >
                  Takası Reddet
                </Button>
              </Group>
            </Alert>
          )}

          {error ? <Alert color="red" variant="light">{error}</Alert> : null}

          <Group justify="space-between">
            {isEdit && onDelete ? (
              <Button color="red" variant="light" type="button" onClick={() => {
                const employeeName = employees?.find((e) => e.value === selectedEmployeeId)?.label ?? selectedEmployeeId;
                const dateRange = initial?.start && initial?.end
                  ? `${formatDateShort(initial.start)} ${formatTimeOnly(initial.start)} – ${formatTimeOnly(initial.end)}`
                  : '—';
                const noteLine = initial?.note ? `Not: ${initial.note}` : null;
                import('@mantine/modals').then(({ modals }) => {
                  modals.openConfirmModal({
                    title: 'Vardiyayı iptal et',
                    centered: true,
                    children: (
                      <Stack gap="xs">
                        <Text size="sm" c="dimmed">
                          Aşağıdaki vardiyayı iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </Text>
                        <Text size="sm" fw={600}>Çalışan: {employeeName}</Text>
                        <Text size="sm">Tarih ve saat: {dateRange}</Text>
                        {noteLine ? <Text size="sm" c="dimmed">{noteLine}</Text> : null}
                      </Stack>
                    ),
                    labels: { confirm: 'Evet, İptal Et', cancel: 'Vazgeç' },
                    confirmProps: { color: 'red' },
                    onConfirm: handleDelete,
                  });
                });
              }} loading={deleting}>
                Vardiyayı İptal Et
              </Button>
            ) : <span />}
            <Group>
              <Button variant="default" onClick={onClose} type="button">
                Vazgeç
              </Button>
              <Button
                type="submit"
                loading={submitting}
                data-testid="shift-submit"
                disabled={
                  (availabilityConflicts.length > 0 && !forceOverride) ||
                  !!overlapWarning ||
                  (isPastDate && !retroactive && !isEdit)
                }
              >
                Kaydet
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
