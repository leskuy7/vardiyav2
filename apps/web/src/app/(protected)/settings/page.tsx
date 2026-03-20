"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCalendarEvent, IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { PageError, PageLoading } from '../../../components/page-states';
import { api } from '../../../lib/api';
import {
  DEFAULT_PRINT_FORM_CONFIG,
  PrintFormConfig,
  PrintFormShiftSegment,
  PrintFormShiftTemplate,
} from '../../../lib/print-form';

type OrgSettings = {
  maxWeeklyHours: number;
  overtimeMultiplier: number;
  currency: string;
  workDays: number[];
  shiftMinDuration: number;
  shiftMaxDuration: number;
  printFormConfig: PrintFormConfig;
};

const DAY_LABELS = ['Paz', 'Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt'];
const LEAVE_CODE_FIELDS = [
  { key: 'ANNUAL', label: 'Yillik Izin' },
  { key: 'SICK', label: 'Raporlu' },
  { key: 'UNPAID', label: 'Ucretsiz Izin' },
  { key: 'OTHER', label: 'Diger' },
  { key: 'OFF', label: 'OFF' },
] as const;

function createEmptyTemplate(): PrintFormShiftTemplate {
  return {
    code: '',
    title: 'SHIFT:',
    startTime: '',
    endTime: '',
    totalHoursLabel: '',
    isActive: false,
    segments: [],
  };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery<OrgSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data;
    },
  });

  const [form, setForm] = useState<OrgSettings>({
    maxWeeklyHours: 45,
    overtimeMultiplier: 1.5,
    currency: 'TRY',
    workDays: [1, 2, 3, 4, 5],
    shiftMinDuration: 60,
    shiftMaxDuration: 720,
    printFormConfig: DEFAULT_PRINT_FORM_CONFIG,
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      ...data,
      printFormConfig: {
        ...DEFAULT_PRINT_FORM_CONFIG,
        ...data.printFormConfig,
        headerDefaults: {
          ...DEFAULT_PRINT_FORM_CONFIG.headerDefaults,
          ...(data.printFormConfig?.headerDefaults ?? {}),
        },
        leaveCodeMap: {
          ...DEFAULT_PRINT_FORM_CONFIG.leaveCodeMap,
          ...(data.printFormConfig?.leaveCodeMap ?? {}),
        },
        shiftTemplates: data.printFormConfig?.shiftTemplates?.length
          ? data.printFormConfig.shiftTemplates
          : DEFAULT_PRINT_FORM_CONFIG.shiftTemplates,
      },
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      await api.patch('/settings', form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      notifications.show({ title: 'Basarili', message: 'Ayarlar kaydedildi', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Hata', message: 'Ayarlar kaydedilemedi', color: 'red' });
    },
  });

  if (isLoading) return <PageLoading />;
  if (isError) return <PageError message="Ayarlar yuklenemedi." />;

  const updateHeaderDefault = (field: keyof PrintFormConfig['headerDefaults'], value: string) => {
    setForm((current) => ({
      ...current,
      printFormConfig: {
        ...current.printFormConfig,
        headerDefaults: {
          ...current.printFormConfig.headerDefaults,
          [field]: value,
        },
      },
    }));
  };

  const updateLeaveCodeMap = (key: string, value: string) => {
    setForm((current) => ({
      ...current,
      printFormConfig: {
        ...current.printFormConfig,
        leaveCodeMap: {
          ...current.printFormConfig.leaveCodeMap,
          [key]: value,
        },
      },
    }));
  };

  const updateTemplate = (
    templateIndex: number,
    field: keyof Omit<PrintFormShiftTemplate, 'segments'>,
    value: string | boolean,
  ) => {
    setForm((current) => ({
      ...current,
      printFormConfig: {
        ...current.printFormConfig,
        shiftTemplates: current.printFormConfig.shiftTemplates.map((template, currentIndex) =>
          currentIndex === templateIndex ? { ...template, [field]: value } : template,
        ),
      },
    }));
  };

  const addTemplate = () => {
    setForm((current) => ({
      ...current,
      printFormConfig: {
        ...current.printFormConfig,
        shiftTemplates: [...current.printFormConfig.shiftTemplates, createEmptyTemplate()],
      },
    }));
  };

  const removeTemplate = (templateIndex: number) => {
    setForm((current) => ({
      ...current,
      printFormConfig: {
        ...current.printFormConfig,
        shiftTemplates: current.printFormConfig.shiftTemplates.filter((_, currentIndex) => currentIndex !== templateIndex),
      },
    }));
  };

  const addSegment = (templateIndex: number) => {
    setForm((current) => ({
      ...current,
      printFormConfig: {
        ...current.printFormConfig,
        shiftTemplates: current.printFormConfig.shiftTemplates.map((template, currentIndex) =>
          currentIndex === templateIndex
            ? {
                ...template,
                segments: [
                  ...template.segments,
                  { label: '', startTime: '', endTime: '', durationLabel: '' },
                ],
              }
            : template,
        ),
      },
    }));
  };

  const updateSegment = (
    templateIndex: number,
    segmentIndex: number,
    field: keyof PrintFormShiftSegment,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      printFormConfig: {
        ...current.printFormConfig,
        shiftTemplates: current.printFormConfig.shiftTemplates.map((template, currentIndex) =>
          currentIndex === templateIndex
            ? {
                ...template,
                segments: template.segments.map((segment, currentSegmentIndex) =>
                  currentSegmentIndex === segmentIndex ? { ...segment, [field]: value } : segment,
                ),
              }
            : template,
        ),
      },
    }));
  };

  const removeSegment = (templateIndex: number, segmentIndex: number) => {
    setForm((current) => ({
      ...current,
      printFormConfig: {
        ...current.printFormConfig,
        shiftTemplates: current.printFormConfig.shiftTemplates.map((template, currentIndex) =>
          currentIndex === templateIndex
            ? {
                ...template,
                segments: template.segments.filter((_, currentSegmentIndex) => currentSegmentIndex !== segmentIndex),
              }
            : template,
        ),
      },
    }));
  };

  return (
    <Stack>
      <Group justify="space-between" align="center" wrap="wrap">
        <Stack gap={2}>
          <Group gap="xs">
            <Badge variant="light">AYARLAR</Badge>
          </Group>
          <Title order={2}>Organizasyon Ayarlari</Title>
          <Text c="dimmed" size="sm">Calisma kurallarini, vardiya sinirlarini ve yazdirma formu sablonlarini buradan yonetin.</Text>
        </Stack>
        <Group>
          <Button
            variant="light"
            component="a"
            href="/settings/holidays"
            leftSection={<IconCalendarEvent size={16} />}
          >
            Tatil Takvimi
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={() => save.mutate()}
            loading={save.isPending}
          >
            Kaydet
          </Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder p="md" radius="md">
            <Title order={4} mb="md">Calisma Kurallari</Title>
            <Stack>
              <NumberInput
                label="Haftalik Maksimum Saat"
                description="4857 uyumlu varsayilan max calisma saati"
                value={form.maxWeeklyHours}
                onChange={(value) => setForm((current) => ({ ...current, maxWeeklyHours: Number(value) || 45 }))}
                min={1}
                max={168}
              />
              <NumberInput
                label="Mesai Carpani"
                description="Fazla mesai hesaplama katsayisi"
                value={form.overtimeMultiplier}
                onChange={(value) => setForm((current) => ({ ...current, overtimeMultiplier: Number(value) || 1.5 }))}
                min={1}
                max={5}
                step={0.1}
                decimalScale={1}
              />
              <Select
                label="Para Birimi"
                data={[
                  { value: 'TRY', label: 'TL' },
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                ]}
                value={form.currency}
                onChange={(value) => setForm((current) => ({ ...current, currency: value || 'TRY' }))}
              />
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder p="md" radius="md">
            <Title order={4} mb="md">Vardiya Ayarlari</Title>
            <Stack>
              <NumberInput
                label="Minimum Vardiya Suresi (dakika)"
                value={form.shiftMinDuration}
                onChange={(value) => setForm((current) => ({ ...current, shiftMinDuration: Number(value) || 60 }))}
                min={15}
                max={480}
                step={15}
              />
              <NumberInput
                label="Maksimum Vardiya Suresi (dakika)"
                value={form.shiftMaxDuration}
                onChange={(value) => setForm((current) => ({ ...current, shiftMaxDuration: Number(value) || 720 }))}
                min={60}
                max={1440}
                step={30}
              />
              <NumberInput
                label="Sayfa Basina Satir"
                value={form.printFormConfig.rowsPerPage}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    printFormConfig: {
                      ...current.printFormConfig,
                      rowsPerPage: Number(value) || 20,
                    },
                  }))
                }
                min={1}
                max={50}
              />
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card withBorder p="md" radius="md">
            <Title order={4} mb="md">Calisma Gunleri</Title>
            <Group>
              {DAY_LABELS.map((label, dayIndex) => (
                <Checkbox
                  key={dayIndex}
                  label={label}
                  checked={form.workDays.includes(dayIndex)}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      workDays: event.currentTarget.checked
                        ? [...current.workDays, dayIndex].sort((left, right) => left - right)
                        : current.workDays.filter((value) => value !== dayIndex),
                    }));
                  }}
                />
              ))}
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card withBorder p="md" radius="md">
            <Stack gap="md">
              <Group justify="space-between" align="center" wrap="wrap">
                <div>
                  <Title order={4}>Yazdirma Formu</Title>
                  <Text size="sm" c="dimmed">
                    Genis yazdir ekraninin varsayilan basliklarini, izin kisaltmalarini ve vardiya sablonlarini yonetin.
                  </Text>
                </div>
                <Button leftSection={<IconPlus size={16} />} variant="light" onClick={addTemplate}>
                  Sablon Ekle
                </Button>
              </Group>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Card withBorder radius="md" p="md">
                    <Title order={5} mb="sm">Baslik Varsayilanlari</Title>
                    <Stack>
                      <TextInput
                        label="Form Basligi"
                        value={form.printFormConfig.headerDefaults.formTitle}
                        onChange={(event) => updateHeaderDefault('formTitle', event.currentTarget.value)}
                      />
                      <TextInput
                        label="Departman Etiketi"
                        value={form.printFormConfig.headerDefaults.departmentLabel}
                        onChange={(event) => updateHeaderDefault('departmentLabel', event.currentTarget.value)}
                      />
                      <TextInput
                        label="Tarihten Etiketi"
                        value={form.printFormConfig.headerDefaults.dateFromLabel}
                        onChange={(event) => updateHeaderDefault('dateFromLabel', event.currentTarget.value)}
                      />
                      <TextInput
                        label="Tarihine Kadar Etiketi"
                        value={form.printFormConfig.headerDefaults.dateToLabel}
                        onChange={(event) => updateHeaderDefault('dateToLabel', event.currentTarget.value)}
                      />
                    </Stack>
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Card withBorder radius="md" p="md">
                    <Title order={5} mb="sm">Izin Kodlari</Title>
                    <Stack>
                      {LEAVE_CODE_FIELDS.map((field) => (
                        <TextInput
                          key={field.key}
                          label={field.label}
                          value={form.printFormConfig.leaveCodeMap[field.key] ?? ''}
                          onChange={(event) => updateLeaveCodeMap(field.key, event.currentTarget.value)}
                        />
                      ))}
                    </Stack>
                  </Card>
                </Grid.Col>
              </Grid>

              <Stack gap="sm">
                {form.printFormConfig.shiftTemplates.map((template, templateIndex) => (
                  <Card key={`${template.code || 'template'}-${templateIndex}`} withBorder radius="md" p="md">
                    <Stack gap="sm">
                      <Group justify="space-between" align="center" wrap="wrap">
                        <Group gap="xs">
                          <Badge variant="light">{template.code || `Sablon ${templateIndex + 1}`}</Badge>
                          <Checkbox
                            label="Aktif"
                            checked={template.isActive}
                            onChange={(event) => updateTemplate(templateIndex, 'isActive', event.currentTarget.checked)}
                          />
                        </Group>
                        <Group>
                          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => addSegment(templateIndex)}>
                            Segment Ekle
                          </Button>
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => removeTemplate(templateIndex)}
                            aria-label="Sablonu sil"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>

                      <Grid>
                        <Grid.Col span={{ base: 12, md: 2 }}>
                          <TextInput
                            label="Kod"
                            value={template.code}
                            onChange={(event) => updateTemplate(templateIndex, 'code', event.currentTarget.value.toUpperCase())}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                          <TextInput
                            label="Baslik"
                            value={template.title}
                            onChange={(event) => updateTemplate(templateIndex, 'title', event.currentTarget.value)}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 2 }}>
                          <TextInput
                            label="Baslangic"
                            placeholder="08:00"
                            value={template.startTime}
                            onChange={(event) => updateTemplate(templateIndex, 'startTime', event.currentTarget.value)}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 2 }}>
                          <TextInput
                            label="Bitis"
                            placeholder="16:00"
                            value={template.endTime}
                            onChange={(event) => updateTemplate(templateIndex, 'endTime', event.currentTarget.value)}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 2 }}>
                          <TextInput
                            label="Toplam"
                            placeholder="7.5 SAAT"
                            value={template.totalHoursLabel}
                            onChange={(event) => updateTemplate(templateIndex, 'totalHoursLabel', event.currentTarget.value)}
                          />
                        </Grid.Col>
                      </Grid>

                      <Stack gap="xs">
                        {template.segments.map((segment, segmentIndex) => (
                          <Card key={`${template.code}-segment-${segmentIndex}`} withBorder radius="md" p="sm">
                            <Grid align="end">
                              <Grid.Col span={{ base: 12, md: 4 }}>
                                <TextInput
                                  label="Aciklama"
                                  value={segment.label}
                                  onChange={(event) => updateSegment(templateIndex, segmentIndex, 'label', event.currentTarget.value)}
                                />
                              </Grid.Col>
                              <Grid.Col span={{ base: 12, md: 2 }}>
                                <TextInput
                                  label="Baslangic"
                                  placeholder="08:00"
                                  value={segment.startTime}
                                  onChange={(event) => updateSegment(templateIndex, segmentIndex, 'startTime', event.currentTarget.value)}
                                />
                              </Grid.Col>
                              <Grid.Col span={{ base: 12, md: 2 }}>
                                <TextInput
                                  label="Bitis"
                                  placeholder="12:00"
                                  value={segment.endTime}
                                  onChange={(event) => updateSegment(templateIndex, segmentIndex, 'endTime', event.currentTarget.value)}
                                />
                              </Grid.Col>
                              <Grid.Col span={{ base: 12, md: 3 }}>
                                <TextInput
                                  label="Sure"
                                  placeholder="4 SAAT"
                                  value={segment.durationLabel}
                                  onChange={(event) => updateSegment(templateIndex, segmentIndex, 'durationLabel', event.currentTarget.value)}
                                />
                              </Grid.Col>
                              <Grid.Col span={{ base: 12, md: 1 }}>
                                <ActionIcon
                                  color="red"
                                  variant="light"
                                  onClick={() => removeSegment(templateIndex, segmentIndex)}
                                  aria-label="Segment sil"
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Grid.Col>
                            </Grid>
                          </Card>
                        ))}
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
