"use client";

import { Alert, Button, Checkbox, Group, Modal, Select, Stack, TextInput, Text } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type EmployeeOption = { value: string; label: string };

type ShiftModalProps = {
  opened: boolean;
  onClose: () => void;
  onSubmit: (payload: { employeeId: string; startTime: string; endTime: string; note?: string; forceOverride?: boolean }) => Promise<void>;
  onDelete?: () => Promise<void>;
  employeeId: string;
  employees?: EmployeeOption[];
  initial?: {
    start: string;
    end: string;
    note?: string;
  };
};

const SHIFT_TEMPLATES = [
  { label: 'Sabah (06:00-14:00)', startHour: 6, endHour: 14 },
  { label: 'Öğle (14:00-22:00)', startHour: 14, endHour: 22 },
  { label: 'Gece (22:00-06:00)', startHour: 22, endHour: 30 }
];

function applyTemplate(baseDate: Date, startHour: number, endHour: number) {
  const dayStart = new Date(baseDate);
  dayStart.setUTCHours(0, 0, 0, 0);

  const startAt = new Date(dayStart);
  startAt.setUTCHours(startHour, 0, 0, 0);

  const endAt = new Date(dayStart);
  endAt.setUTCHours(endHour, 0, 0, 0);

  return { startAt, endAt };
}

export function ShiftModal({ opened, onClose, onSubmit, onDelete, employeeId, employees, initial }: ShiftModalProps) {
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [note, setNote] = useState('');
  const [forceOverride, setForceOverride] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = Boolean(initial);

  useEffect(() => {
    setStartAt(initial?.start ? new Date(initial.start) : null);
    setEndAt(initial?.end ? new Date(initial.end) : null);
    setNote(initial?.note ?? '');
    setForceOverride(false);
    setError(null);
    setSelectedEmployeeId(employeeId);
  }, [employeeId, initial, opened]);

  const selectedDate = useMemo(() => startAt ?? endAt ?? new Date(), [startAt, endAt]);

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

    setSubmitting(true);
    try {
      await onSubmit({
        employeeId: selectedEmployeeId,
        startTime: startAt.toISOString(),
        endTime: endAt.toISOString(),
        note: note || undefined,
        forceOverride
      });
      onClose();
    } catch {
      setError('Vardiya kaydedilemedi. Alanları kontrol edip tekrar dene.');
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
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Vardiya Düzenle' : 'Vardiya Ekle'}>
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

          <DateTimePicker label="Başlangıç" value={startAt} onChange={setStartAt} required data-testid="shift-start" />
          <DateTimePicker label="Bitiş" value={endAt} onChange={setEndAt} required data-testid="shift-end" />
          <TextInput label="Not" value={note} onChange={(event) => setNote(event.currentTarget.value)} />
          <Checkbox
            label="Müsaitlik çakışmasını override et"
            checked={forceOverride}
            onChange={(event) => setForceOverride(event.currentTarget.checked)}
          />

          {error ? <Alert color="red" variant="light">{error}</Alert> : null}

          <Group justify="space-between">
            {isEdit && onDelete ? (
              <Button color="red" variant="light" type="button" onClick={() => {
                import('@mantine/modals').then(({ modals }) => {
                  modals.openConfirmModal({
                    title: 'Emin misiniz?',
                    centered: true,
                    children: (
                      <Text size="sm">
                        Bu vardiyayı gerçekten silmek istiyor musunuz? Bu işlem geri alınamaz.
                      </Text>
                    ),
                    labels: { confirm: 'Evet, Sil', cancel: 'Vazgeç' },
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
              <Button type="submit" loading={submitting} data-testid="shift-submit">
                Kaydet
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
