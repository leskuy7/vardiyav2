"use client";

import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Stack,
  Text,
  Title,
  Select,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  PageEmpty,
  PageError,
  PageLoading,
} from "../../../components/page-states";
import { useShiftsActions } from "../../../hooks/use-shifts";
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
    .filter((e: any) => e.id !== currentUserId)
    .map((e: any) => ({
      value: e.id,
      label: `${e.user?.name || "Bilinmiyor"} (${e.department || "Departman Yok"})`,
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

export default function MyShiftsPage() {
  const weekStart = currentWeekStartIsoDate();
  const { acknowledgeShift, declineShift } = useShiftsActions(weekStart);

  const { data: me } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await api.get("/auth/me");
      return response.data as { employee?: { id: string } };
    },
  });

  const employeeId = me?.employee?.id;

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
    queryKey: ["employees", "active"],
    enabled: Boolean(employeeId), // fetch colleagues
    queryFn: async () => {
      const response = await api.get("/employees?active=true");
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

      {(data ?? []).length === 0 ? (
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
                          const reason = window.prompt("Lütfen vardiyayı reddetme nedeninizi yazın:");
                          if (reason === null) return; // Cancelled
                          if (reason.trim() === '') {
                            notifications.show({ title: "Hata", message: "Reddetme nedeni boş bırakılamaz.", color: "red" });
                            return;
                          }
                          declineShift.mutate({ shiftId: shift.id, reason }, {
                            onSuccess: () => notifications.show({ title: "Reddedildi", message: "Vardiya reddedildi.", color: "orange" }),
                            onError: (err: any) => notifications.show({ title: "Hata", message: err?.response?.data?.message ?? "Reddetme başarısız.", color: "red" })
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
      )}
    </Stack>
  );
}
