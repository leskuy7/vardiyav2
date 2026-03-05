"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Select,
} from "@mantine/core";
import { IconClock, IconLogin, IconLogout as IconLogoutClock } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import {
  PageEmpty,
  PageError,
  PageLoading,
} from "../../../components/page-states";
import { useAuth } from "../../../hooks/use-auth";
import { useShiftsActions } from "../../../hooks/use-shifts";
import { useActiveTimeEntry, useTimeEntryActions } from "../../../hooks/use-time-entries";
import {
  getShiftStatusColor,
  getShiftStatusIcon,
  getShiftStatusLabel,
} from "../../../lib/shift-status";
import {
  currentWeekStartIsoDate,
  formatDateShort,
  formatTimeOnly,
} from "../../../lib/time";
import { api } from "../../../lib/api";

type ShiftItem = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
};

function SwapRequestModalContent({ shift, employees, currentUserId, onSuccess }: any) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const options = employees
    .filter((e: { id: string }) => e.id !== currentUserId)
    .map((e: { id: string; name?: string; user?: { name?: string }; department?: string | null }) => ({
      value: e.id,
      label: `${e.user?.name ?? e.name ?? "Bilinmiyor"} (${e.department ?? "Departman Yok"})`,
    }));

  options.unshift({ value: "OPEN", label: "Herkese Açık / Herhangi Biri" });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post("/swap-requests", {
        shiftId: shift.id,
        targetEmployeeId: targetId === "OPEN" || !targetId ? undefined : targetId,
      });
      notifications.show({ title: "Başarılı", message: "Takas isteği gönderildi.", color: "green" });
      onSuccess();
    } catch (err: any) {
      notifications.show({ title: "Hata", message: err?.response?.data?.message || "Takas isteği başarısız.", color: "red" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Text size="sm">
        Vardiyanızı kiminle takas etmek istiyorsunuz? Seçilen çalışan ya da yönetici onayladığında vardiya aktarılacaktır.
      </Text>

      <Select
        label="Hedef Personel Seçimi:"
        placeholder="Çalışan Seçin..."
        data={options}
        value={targetId}
        onChange={setTargetId}
        searchable
      />
      <Button loading={loading} onClick={handleSubmit} fullWidth mt="md">
        Gönder
      </Button>
    </Stack>
  );
}

function formatDuration(startIso: string) {
  const ms = Date.now() - new Date(startIso).getTime();
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h} saat ${m} dk`;
}

export default function MyShiftsPage() {
  const weekStart = currentWeekStartIsoDate();
  const { acknowledgeShift, declineShift } = useShiftsActions(weekStart);
  const { data: me } = useAuth();

  const employeeId = me?.employee?.id;

  const { data: activeEntry } = useActiveTimeEntry(!!employeeId);
  const { checkIn, checkOut } = useTimeEntryActions();

  // Live duration ticker
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!activeEntry) return;
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-shifts", employeeId],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      const response = await api.get<ShiftItem[]>(
        `/shifts?employeeId=${employeeId}`,
      );
      return response.data;
    },
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees", "swap-targets"],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      const response = await api.get("/employees/swap-targets");
      return response.data;
    },
  });

  const total = data?.length ?? 0;
  const published = useMemo(
    () => (data ?? []).filter((shift) => shift.status === "PUBLISHED").length,
    [data],
  );
  const acknowledged = useMemo(
    () =>
      (data ?? []).filter((shift) => shift.status === "ACKNOWLEDGED").length,
    [data],
  );

  if (isLoading) return <PageLoading />;
  if (isError) return <PageError message="Vardiyalar yüklenemedi." />;

  return (
    <Stack>
      <Stack gap={2}>
        <Badge variant="light" w="fit-content">
          ÇALIŞAN PANELİ
        </Badge>
        <Title order={2}>Vardiyalarım</Title>
        <Text c="dimmed" size="sm">
          Planlanan vardiyalarını takip et ve yayınlananları onayla.
        </Text>
      </Stack>

      {/* ─── Puantaj Durumu ─── */}
      {activeEntry ? (
        <Paper
          withBorder
          radius="md"
          p="md"
          className="surface-card"
          style={{ borderLeft: '3px solid var(--mantine-color-green-filled)' }}
        >
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <ThemeIcon variant="gradient" gradient={{ from: 'green', to: 'teal' }} radius="xl">
                <IconClock size={18} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text fw={700} size="sm">Puantaj Açık — Çalışıyorsunuz</Text>
                <Text c="dimmed" size="xs">
                  Giriş: {formatTimeOnly(activeEntry.checkInAt)} · Süre: {formatDuration(activeEntry.checkInAt)}
                </Text>
              </Stack>
            </Group>
            <Button
              color="red"
              variant="light"
              leftSection={<IconLogoutClock size={16} />}
              loading={checkOut.isPending}
              onClick={() =>
                checkOut.mutate(
                  { entryId: activeEntry.id },
                  {
                    onSuccess: () =>
                      notifications.show({ title: 'Çıkış Yapıldı', message: 'Puantaj başarıyla kapatıldı.', color: 'green' }),
                    onError: (err: any) =>
                      notifications.show({ title: 'Hata', message: err?.response?.data?.message ?? 'Çıkış başarısız.', color: 'red' }),
                  }
                )
              }
            >
              Çıkış Yap
            </Button>
          </Group>
        </Paper>
      ) : (
        <Paper withBorder radius="md" p="md" className="surface-card">
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <ThemeIcon variant="light" color="gray" radius="xl">
                <IconClock size={18} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">Henüz giriş yapılmadı. Aşağıdaki vardiyadan giriş yapabilirsiniz.</Text>
            </Group>
            <Button
              variant="gradient"
              gradient={{ from: 'indigo', to: 'violet' }}
              leftSection={<IconLogin size={16} />}
              loading={checkIn.isPending}
              onClick={() =>
                checkIn.mutate(
                  {},
                  {
                    onSuccess: () =>
                      notifications.show({ title: 'Giriş Yapıldı', message: 'Puantaj başarıyla başlatıldı.', color: 'green' }),
                    onError: (err: any) =>
                      notifications.show({ title: 'Hata', message: err?.response?.data?.message ?? 'Giriş başarısız.', color: 'red' }),
                  }
                )
              }
            >
              Giriş Yap
            </Button>
          </Group>
        </Paper>
      )}

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">
              Toplam Vardiya
            </Text>
            <Title order={3}>{total}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">
              Onay Bekleyen
            </Text>
            <Title order={3}>{published}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">
              Onaylanan
            </Text>
            <Title order={3}>{acknowledged}</Title>
          </Card>
        </Grid.Col>
      </Grid>

      {
        (data ?? []).length === 0 ? (
          <PageEmpty
            title="Henüz atanmış vardiya yok"
            description="Yeni vardiya atandığında bu listede görünecek."
          />
        ) : (
          <Stack>
            {(data ?? []).map((shift: ShiftItem) => (
              <Card
                key={shift.id}
                withBorder
                radius="md"
                p="md"
                className="surface-card interactive-card"
              >
                <Group justify="space-between" align="center">
                  <Stack gap={2}>
                    <Text fw={700}>
                      {formatDateShort(shift.startTime)} —{" "}
                      {formatTimeOnly(shift.startTime)} -{" "}
                      {formatTimeOnly(shift.endTime)}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Vardiya ID: #{shift.id.slice(0, 8)}
                    </Text>
                  </Stack>
                  <Group>
                    <Badge
                      variant="light"
                      color={getShiftStatusColor(shift.status)}
                      leftSection={(() => {
                        const StatusIcon = getShiftStatusIcon(shift.status);
                        return <StatusIcon size={12} />;
                      })()}
                    >
                      {getShiftStatusLabel(shift.status)}
                    </Badge>
                    {shift.status === "PUBLISHED" || shift.status === "PROPOSED" ? (
                      <Group gap="xs">
                        <Button
                          size="xs"
                          loading={acknowledgeShift.isPending}
                          onClick={() =>
                            acknowledgeShift.mutate(shift.id, {
                              onSuccess: () =>
                                notifications.show({
                                  title: "Onaylandı",
                                  message: "Vardiya başarıyla onaylandı.",
                                  color: "green",
                                }),
                              onError: (err: any) => {
                                const msg =
                                  err?.response?.data?.message ??
                                  "Onay başarısız oldu.";
                                notifications.show({
                                  title: "Hata",
                                  message: msg,
                                  color: "red",
                                });
                              },
                            })
                          }
                        >
                          Onayla
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          loading={declineShift.isPending}
                          onClick={() => {
                            let declineReason = '';
                            modals.openConfirmModal({
                              title: 'Vardiyayı Reddet',
                              centered: true,
                              children: (
                                <Stack gap="xs">
                                  <Text size="sm" c="dimmed">
                                    Bu vardiyayı reddetmek istediğinize emin misiniz?
                                  </Text>
                                  <TextInput
                                    label="Reddetme nedeni"
                                    placeholder="Nedeninizi yazın..."
                                    required
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { declineReason = e.currentTarget.value; }}
                                  />
                                </Stack>
                              ),
                              labels: { confirm: 'Reddet', cancel: 'Vazgeç' },
                              confirmProps: { color: 'red' },
                              onConfirm: () => {
                                if (declineReason.trim() === '') {
                                  notifications.show({ title: "Hata", message: "Reddetme nedeni boş bırakılamaz.", color: "red" });
                                  return;
                                }
                                declineShift.mutate({ shiftId: shift.id, reason: declineReason }, {
                                  onSuccess: () => notifications.show({ title: "Reddedildi", message: "Vardiya reddedildi.", color: "orange" }),
                                  onError: (err: any) => notifications.show({ title: "Hata", message: err?.response?.data?.message ?? "Reddetme başarısız.", color: "red" })
                                });
                              },
                            });
                          }}
                        >
                          Reddet
                        </Button>
                      </Group>
                    ) : shift.status === "ACKNOWLEDGED" ? (
                      <Button
                        size="xs"
                        color="orange"
                        variant="light"
                        onClick={() => {
                          modals.open({
                            title: "Vardiya Takası İste",
                            children: (
                              <SwapRequestModalContent
                                shift={shift}
                                employees={employeesData ?? []}
                                currentUserId={employeeId}
                                onSuccess={() => modals.closeAll()}
                              />
                            ),
                          });
                        }}
                      >
                        Takas İste
                      </Button>
                    ) : null}
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        )
      }
    </Stack >
  );
}
