"use client";

import { ActionIcon, Badge, Button, Card, Group, Modal, Stack, Switch, Table, Text, TextInput, Title } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconArrowLeft, IconCalendarEvent, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { PageError, PageLoading } from '../../../../components/page-states';
import { api } from '../../../../lib/api';
import { toIstanbulIsoDate } from '../../../../lib/time';

type Holiday = {
    id: string;
    name: string;
    date: string;
    isRecurring: boolean;
};

const TR_HOLIDAYS_2026 = [
    { name: 'Yilbasi', date: '2026-01-01', isRecurring: true },
    { name: 'Ulusal Egemenlik ve Cocuk Bayrami', date: '2026-04-23', isRecurring: true },
    { name: 'Emek ve Dayanisma Gunu', date: '2026-05-01', isRecurring: true },
    { name: 'Ataturk Anma, Genclik ve Spor Bayrami', date: '2026-05-19', isRecurring: true },
    { name: 'Zafer Bayrami', date: '2026-08-30', isRecurring: true },
    { name: 'Cumhuriyet Bayrami', date: '2026-10-29', isRecurring: true },
];

export default function HolidaysPage() {
    const queryClient = useQueryClient();
    const currentYear = new Date().getFullYear();
    const [addOpen, setAddOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDate, setNewDate] = useState<Date | null>(null);
    const [newRecurring, setNewRecurring] = useState(false);

    const { data: holidays, isLoading, isError } = useQuery<Holiday[]>({
        queryKey: ['holidays', currentYear],
        queryFn: async () => {
            const { data } = await api.get(`/holidays?year=${currentYear}`);
            return Array.isArray(data) ? data : [];
        },
    });

    const addHoliday = useMutation({
        mutationFn: async (h: { name: string; date: string; isRecurring: boolean }) => {
            await api.post('/holidays', h);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            setAddOpen(false);
            setNewName('');
            setNewDate(null);
            notifications.show({ title: 'Basarili', message: 'Tatil eklendi', color: 'green' });
        },
        onError: () => {
            notifications.show({ title: 'Hata', message: 'Tatil eklenemedi', color: 'red' });
        },
    });

    const removeHoliday = useMutation({
        mutationFn: async (id: string) => { await api.delete(`/holidays/${id}`); },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            notifications.show({ title: 'Basarili', message: 'Tatil silindi', color: 'green' });
        },
    });

    const seedHolidays = useMutation({
        mutationFn: async () => {
            for (const h of TR_HOLIDAYS_2026) {
                try { await api.post('/holidays', h); } catch { /* skip */ }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            notifications.show({ title: 'Basarili', message: 'Turkiye resmi tatilleri eklendi', color: 'green' });
        },
    });

    if (isLoading) return <PageLoading />;
    if (isError) return <PageError message="Tatiller yuklenemedi." />;

    return (
        <Stack>
            <Group justify="space-between" align="center" wrap="wrap">
                <Stack gap={2}>
                    <Group gap="xs">
                        <Badge variant="light">AYARLAR</Badge>
                        <Badge variant="light" color="grape">TATIL TAKVIMI</Badge>
                    </Group>
                    <Title order={2}>Resmi Tatiller - {currentYear}</Title>
                    <Text c="dimmed" size="sm">Resmi tatilleri yonetin. Vardiya planlamada uyari gosterilir.</Text>
                </Stack>
                <Group>
                    <Button variant="default" component="a" href="/settings" leftSection={<IconArrowLeft size={16} />}>
                        Ayarlara Dön
                    </Button>
                    <Button variant="light" color="grape" onClick={() => seedHolidays.mutate()} loading={seedHolidays.isPending}>
                        Turkiye Tatillerini Yukle
                    </Button>
                    <Button leftSection={<IconPlus size={16} />} onClick={() => setAddOpen(true)}>
                        Yeni Tatil Ekle
                    </Button>
                </Group>
            </Group>

            <Card withBorder p="md" radius="md">
                {(!holidays || holidays.length === 0) ? (
                    <Text c="dimmed" ta="center" py="xl">Henuz tatil tanimlanmamis.</Text>
                ) : (
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Tatil Adi</Table.Th>
                                <Table.Th>Tarih</Table.Th>
                                <Table.Th>Her Yil Tekrar</Table.Th>
                                <Table.Th w={60} />
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {holidays.map((h) => (
                                <Table.Tr key={h.id}>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <IconCalendarEvent size={16} style={{ opacity: 0.5 }} />
                                            <Text fw={500}>{h.name}</Text>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>{new Date(h.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Table.Td>
                                    <Table.Td>{h.isRecurring ? <Badge color="teal" variant="light">Evet</Badge> : <Badge color="gray" variant="light">Hayir</Badge>}</Table.Td>
                                    <Table.Td>
                                        <ActionIcon variant="light" color="red" size="sm" onClick={() => removeHoliday.mutate(h.id)}>
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                )}
            </Card>

            <Modal opened={addOpen} onClose={() => setAddOpen(false)} title="Yeni Tatil Ekle" centered>
                <Stack>
                    <TextInput label="Tatil Adi" placeholder="Or: Ramazan Bayrami" value={newName} onChange={(e) => setNewName(e.currentTarget.value)} />
                    <DateInput label="Tarih" placeholder="Tarih secin" value={newDate} onChange={setNewDate} />
                    <Switch label="Her yil tekrar eder" checked={newRecurring} onChange={(e) => setNewRecurring(e.currentTarget.checked)} />
                    <Button
                        onClick={() => {
                            if (newName && newDate) {
                                addHoliday.mutate({ name: newName, date: toIstanbulIsoDate(newDate), isRecurring: newRecurring });
                            }
                        }}
                        loading={addHoliday.isPending}
                        disabled={!newName || !newDate}
                    >
                        Ekle
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    );
}
