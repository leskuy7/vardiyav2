"use client";

import { Badge, Button, Card, Grid, Group, NumberInput, Select, Stack, Text, Title, Checkbox } from '@mantine/core';
import { IconCalendarEvent, IconDeviceFloppy } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { PageError, PageLoading } from '../../../components/page-states';
import { api } from '../../../lib/api';

type OrgSettings = {
    maxWeeklyHours: number;
    overtimeMultiplier: number;
    currency: string;
    workDays: number[];
    shiftMinDuration: number;
    shiftMaxDuration: number;
};

const DAY_LABELS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const { data, isLoading, isError } = useQuery<OrgSettings>({
        queryKey: ['settings'],
        queryFn: async () => { const { data } = await api.get('/settings'); return data; },
    });

    const [form, setForm] = useState<OrgSettings>({
        maxWeeklyHours: 45,
        overtimeMultiplier: 1.5,
        currency: 'TRY',
        workDays: [1, 2, 3, 4, 5],
        shiftMinDuration: 60,
        shiftMaxDuration: 720,
    });

    useEffect(() => { if (data) setForm(data); }, [data]);

    const save = useMutation({
        mutationFn: async () => { await api.patch('/settings', form); },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            notifications.show({ title: 'Başarılı', message: 'Ayarlar kaydedildi', color: 'green' });
        },
        onError: () => {
            notifications.show({ title: 'Hata', message: 'Ayarlar kaydedilemedi', color: 'red' });
        },
    });

    if (isLoading) return <PageLoading />;
    if (isError) return <PageError message="Ayarlar yüklenemedi." />;

    return (
        <Stack>
            <Group justify="space-between" align="center" wrap="wrap">
                <Stack gap={2}>
                    <Group gap="xs">
                        <Badge variant="light">AYARLAR</Badge>
                    </Group>
                    <Title order={2}>Organizasyon Ayarları</Title>
                    <Text c="dimmed" size="sm">Çalışma kurallarını ve varsayılan değerleri buradan yönetin.</Text>
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
                        <Title order={4} mb="md">Çalışma Kuralları</Title>
                        <Stack>
                            <NumberInput
                                label="Haftalık Maksimum Saat"
                                description="ÇSGB 4857 uyumlu max çalışma saati"
                                value={form.maxWeeklyHours}
                                onChange={(v) => setForm((p) => ({ ...p, maxWeeklyHours: Number(v) || 45 }))}
                                min={1}
                                max={168}
                            />
                            <NumberInput
                                label="Mesai Çarpanı"
                                description="Fazla mesai hesaplama katsayısı"
                                value={form.overtimeMultiplier}
                                onChange={(v) => setForm((p) => ({ ...p, overtimeMultiplier: Number(v) || 1.5 }))}
                                min={1}
                                max={5}
                                step={0.1}
                                decimalScale={1}
                            />
                            <Select
                                label="Para Birimi"
                                data={[
                                    { value: 'TRY', label: '₺ Türk Lirası' },
                                    { value: 'USD', label: '$ Amerikan Doları' },
                                    { value: 'EUR', label: '€ Euro' },
                                ]}
                                value={form.currency}
                                onChange={(v) => setForm((p) => ({ ...p, currency: v || 'TRY' }))}
                            />
                        </Stack>
                    </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card withBorder p="md" radius="md">
                        <Title order={4} mb="md">Vardiya Ayarları</Title>
                        <Stack>
                            <NumberInput
                                label="Minimum Vardiya Süresi (dakika)"
                                value={form.shiftMinDuration}
                                onChange={(v) => setForm((p) => ({ ...p, shiftMinDuration: Number(v) || 60 }))}
                                min={15}
                                max={480}
                                step={15}
                            />
                            <NumberInput
                                label="Maksimum Vardiya Süresi (dakika)"
                                value={form.shiftMaxDuration}
                                onChange={(v) => setForm((p) => ({ ...p, shiftMaxDuration: Number(v) || 720 }))}
                                min={60}
                                max={1440}
                                step={30}
                            />
                        </Stack>
                    </Card>
                </Grid.Col>

                <Grid.Col span={12}>
                    <Card withBorder p="md" radius="md">
                        <Title order={4} mb="md">Çalışma Günleri</Title>
                        <Group>
                            {DAY_LABELS.map((label, i) => (
                                <Checkbox
                                    key={i}
                                    label={label}
                                    checked={form.workDays.includes(i)}
                                    onChange={(e) => {
                                        setForm((p) => ({
                                            ...p,
                                            workDays: e.currentTarget.checked
                                                ? [...p.workDays, i].sort()
                                                : p.workDays.filter((d) => d !== i),
                                        }));
                                    }}
                                />
                            ))}
                        </Group>
                    </Card>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}
