"use client";

import {
    Badge,
    Button,
    Card,
    Group,
    Modal,
    Select,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { LeaveRequest, useLeaves } from "../../../hooks/use-leaves";
import { PageError, PageLoading } from "../../../components/page-states";
import { formatDateShort } from "../../../lib/time";

const LEAVE_TYPES = {
    ANNUAL: "Yıllık İzin",
    SICK: "Hastalık Raporu",
    UNPAID: "Ücretsiz İzin",
    OTHER: "Diğer",
};

const STATUS_COLORS = {
    PENDING: "orange",
    APPROVED: "green",
    REJECTED: "red",
    CANCELLED: "gray",
};

const STATUS_LABELS = {
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    REJECTED: "Reddedildi",
    CANCELLED: "İptal",
};

export default function LeavesPage() {
    const { leavesQuery, createLeave, updateStatus, deleteLeave } = useLeaves();
    const [opened, { open, close }] = useDisclosure(false);

    const { data: me } = useQuery({
        queryKey: ["auth", "me"],
        queryFn: async () => {
            const { data } = await api.get("/auth/me");
            return data;
        },
    });

    const form = useForm({
        initialValues: {
            type: "ANNUAL",
            startDate: null as Date | null,
            endDate: null as Date | null,
            reason: "",
        },
        validate: {
            type: (v: string) => (!v ? "İzin türü zorunludur" : null),
            startDate: (v: Date | null) => (!v ? "Başlangıç tarihi zorunludur" : null),
            endDate: (v: Date | null, values: { startDate: Date | null }) => {
                if (!v) return "Bitiş tarihi zorunludur";
                if (values.startDate && v < values.startDate) {
                    return "Bitiş tarihi, başlangıç tarihinden önce olamaz";
                }
                return null;
            },
        },
    });

    const leaves = leavesQuery.data || [];
    const role = me?.role;

    const handleSubmit = form.onSubmit((values: { type: string; startDate: Date | null; endDate: Date | null; reason: string }) => {
        if (!values.startDate || !values.endDate) return;

        // Normalize to noon UTC to avoid timezone shift dropping dates
        const start = new Date(values.startDate.getTime() - values.startDate.getTimezoneOffset() * 60000);
        const end = new Date(values.endDate.getTime() - values.endDate.getTimezoneOffset() * 60000);

        createLeave.mutate(
            {
                type: values.type,
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                reason: values.reason,
            },
            {
                onSuccess: () => {
                    notifications.show({
                        title: "Başarılı",
                        message: "İzin talebi oluşturuldu",
                        color: "green",
                    });
                    form.reset();
                    close();
                },
                onError: (error: any) => {
                    notifications.show({
                        title: "Hata",
                        message: error.response?.data?.message || "Bir hata oluştu",
                        color: "red",
                    });
                },
            }
        );
    });

    const handleStatusUpdate = (id: string, status: string) => {
        let note;
        if (status === "REJECTED") {
            note = window.prompt("Reddetme nedeninizi yazın (opsiyonel):");
            if (note === null) return;
        }
        updateStatus.mutate(
            { id, status, managerNote: note },
            {
                onSuccess: () =>
                    notifications.show({ title: "Başarılı", message: "Durum güncellendi", color: "green" }),
                onError: (err: any) =>
                    notifications.show({
                        title: "Hata",
                        message: err.response?.data?.message || "Güncelleme başarısız",
                        color: "red",
                    }),
            }
        );
    };

    const handleCancel = (id: string) => {
        if (!window.confirm("Bu izin talebini iptal etmek istediğinize emin misiniz?")) return;
        updateStatus.mutate(
            { id, status: "CANCELLED" },
            {
                onSuccess: () =>
                    notifications.show({ title: "Başarılı", message: "İzin iptal edildi", color: "green" }),
            }
        );
    };

    const handleDelete = (id: string) => {
        if (!window.confirm("Bu kaydı tamamen silmek istediğinize emin misiniz?")) return;
        deleteLeave.mutate(id, {
            onSuccess: () =>
                notifications.show({ title: "Silindi", message: "Kayıt silindi", color: "gray" }),
        });
    };

    return (
        <Stack>
            <Group justify="space-between">
                <Stack gap={2}>
                    <Title order={2}>İzin Yönetimi (PTO)</Title>
                    <Text c="dimmed" size="sm">
                        Tüm izin talepleriniz ve geçmişini buradan takip edebilirsiniz.
                    </Text>
                </Stack>
                {(role === "EMPLOYEE" || role === "MANAGER") && (
                    <Button onClick={open}>Yeni İzin Talep Et</Button>
                )}
            </Group>

            {leavesQuery.isLoading ? (
                <PageLoading />
            ) : leavesQuery.isError ? (
                <PageError message="İzinler yüklenemedi. (Sunucu bağlantısı sağlanamadı)" />
            ) : (
                <>
                    <Card withBorder radius="md" p="md" visibleFrom="md">
                        <Table verticalSpacing="sm">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Personel</Table.Th>
                                    <Table.Th>İzin Türü</Table.Th>
                                    <Table.Th>Tarih Aralığı</Table.Th>
                                    <Table.Th>Gerekçe</Table.Th>
                                    <Table.Th>Yönetici Notu</Table.Th>
                                    <Table.Th>Durum</Table.Th>
                                    <Table.Th align="right">İşlemler</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {leaves.length === 0 ? (
                                    <Table.Tr>
                                        <Table.Td colSpan={7}>
                                            <Text c="dimmed" ta="center" py="xl">
                                                Kayıtlı izin talebi bulunmuyor.
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                ) : (
                                    leaves.map((l: LeaveRequest) => (
                                        <Table.Tr key={l.id}>
                                            <Table.Td>
                                                <Text fw={500} size="sm">
                                                    {l.employee?.user.name}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {l.employee?.department}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>{LEAVE_TYPES[l.type]}</Table.Td>
                                            <Table.Td>
                                                {formatDateShort(l.startDate)} - {formatDateShort(l.endDate)}
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" lineClamp={2} title={l.reason || ""}>
                                                    {l.reason || "-"}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" c="dimmed" lineClamp={2} title={l.managerNote || ""}>
                                                    {l.managerNote || "-"}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge color={STATUS_COLORS[l.status]} variant="light">
                                                    {STATUS_LABELS[l.status]}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td align="right">
                                                <Group gap="xs" justify="flex-end">
                                                    {l.status === "PENDING" && (role === "MANAGER" || role === "ADMIN") && (
                                                        <>
                                                            <Button size="xs" color="green" onClick={() => handleStatusUpdate(l.id, "APPROVED")}>
                                                                Onayla
                                                            </Button>
                                                            <Button size="xs" color="red" variant="light" onClick={() => handleStatusUpdate(l.id, "REJECTED")}>
                                                                Reddet
                                                            </Button>
                                                        </>
                                                    )}
                                                    {l.status === "PENDING" && role === "EMPLOYEE" && l.employeeId === me?.employee?.id && (
                                                        <Button size="xs" color="orange" variant="light" onClick={() => handleCancel(l.id)}>
                                                            İptal Et
                                                        </Button>
                                                    )}
                                                    {role === "ADMIN" && (
                                                        <Button size="xs" color="red" variant="subtle" onClick={() => handleDelete(l.id)}>
                                                            Sil
                                                        </Button>
                                                    )}
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))
                                )}
                            </Table.Tbody>
                        </Table>
                    </Card>

                    <Stack hiddenFrom="md" gap="sm">
                        {leaves.length === 0 ? (
                            <Card withBorder radius="md" p="xl" ta="center">
                                <Text c="dimmed">Kayıtlı izin talebi bulunmuyor.</Text>
                            </Card>
                        ) : (
                            leaves.map((l: LeaveRequest) => (
                                <Card key={l.id} withBorder radius="md" p="md">
                                    <Group justify="space-between" mb="xs">
                                        <div>
                                            <Text fw={600}>{l.employee?.user.name}</Text>
                                            <Text size="xs" c="dimmed">{l.employee?.department}</Text>
                                        </div>
                                        <Badge color={STATUS_COLORS[l.status]} variant="light">
                                            {STATUS_LABELS[l.status]}
                                        </Badge>
                                    </Group>
                                    <Group gap="xs" mb="xs">
                                        <Badge color="indigo" variant="dot">{LEAVE_TYPES[l.type]}</Badge>
                                        <Text size="xs" fw={500}>{formatDateShort(l.startDate)} - {formatDateShort(l.endDate)}</Text>
                                    </Group>
                                    {l.reason && (
                                        <Text size="sm" c="dimmed" mb="xs">Gerekçe: {l.reason}</Text>
                                    )}
                                    {l.managerNote && (
                                        <Text size="sm" c="dimmed" mb="xs">Yönetici Notu: {l.managerNote}</Text>
                                    )}
                                    <Group gap="xs" mt="sm" grow>
                                        {l.status === "PENDING" && (role === "MANAGER" || role === "ADMIN") && (
                                            <>
                                                <Button size="xs" color="green" onClick={() => handleStatusUpdate(l.id, "APPROVED")}>Onayla</Button>
                                                <Button size="xs" color="red" variant="light" onClick={() => handleStatusUpdate(l.id, "REJECTED")}>Reddet</Button>
                                            </>
                                        )}
                                        {l.status === "PENDING" && role === "EMPLOYEE" && l.employeeId === me?.employee?.id && (
                                            <Button size="xs" color="orange" variant="light" onClick={() => handleCancel(l.id)}>İptal Et</Button>
                                        )}
                                        {role === "ADMIN" && (
                                            <Button size="xs" color="red" variant="subtle" onClick={() => handleDelete(l.id)}>Sil</Button>
                                        )}
                                    </Group>
                                </Card>
                            ))
                        )}
                    </Stack>
                </>
            )}

            <Modal opened={opened} onClose={close} title="Yeni İzin Talep Et">
                <form onSubmit={handleSubmit}>
                    <Stack>
                        <Select
                            label="İzin Türü"
                            placeholder="Seçiniz..."
                            data={[
                                { value: "ANNUAL", label: "Yıllık İzin (Ücretli)" },
                                { value: "SICK", label: "Hastalık Raporu" },
                                { value: "UNPAID", label: "Ücretsiz İzin" },
                                { value: "OTHER", label: "Diğer Mazeret İzni" },
                            ]}
                            {...form.getInputProps("type")}
                            withAsterisk
                        />
                        <Group grow>
                            <DateInput
                                label="Başlangıç Tarihi"
                                placeholder="Örn: 2026-05-10"
                                {...form.getInputProps("startDate")}
                                withAsterisk
                                minDate={new Date()}
                            />
                            <DateInput
                                label="Bitiş Tarihi"
                                placeholder="Örn: 2026-05-15"
                                {...form.getInputProps("endDate")}
                                withAsterisk
                                minDate={form.values.startDate || new Date()}
                            />
                        </Group>
                        <TextInput
                            label="Gerekçe / Açıklama"
                            placeholder="Zorunlu değil, isteğe bağlı detaylandırın."
                            {...form.getInputProps("reason")}
                        />
                        <Button type="submit" mt="md" loading={createLeave.isPending}>
                            Talebi Gönder
                        </Button>
                    </Stack>
                </form>
            </Modal>
        </Stack>
    );
}
