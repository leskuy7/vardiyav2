"use client";

import { Alert, Badge, Button, Card, Grid, Group, PasswordInput, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconBriefcase, IconBuilding, IconClock, IconCoin, IconCalendar } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../hooks/use-auth";
import { api } from "../../../lib/api";
import { setAccessToken } from "../../../lib/token-store";

type LeaveBalance = {
  id: string;
  leaveCode: string;
  accruedMinutes: number;
  usedMinutes: number;
  carryMinutes: number;
  adjustedMinutes: number;
  leaveType?: { name: string };
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: me } = useAuth();
  const emp = me?.employee;

  const currentYear = new Date().getFullYear();
  const { data: balancesRaw } = useQuery<LeaveBalance[]>({
    queryKey: ["leave-balances", emp?.id, currentYear],
    queryFn: async () => {
      const { data } = await api.get(`/leave-balances?employeeId=${emp?.id}&year=${currentYear}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!emp?.id,
  });
  const balances = (balancesRaw ?? []).filter((b) => !emp?.id || b);

  const changePassword = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      const { data } = await api.post<{ message: string }>("/auth/change-password", payload);
      return data;
    },
    onSuccess: () => {
      notifications.show({
        title: "Başarılı",
        message: "Şifreniz güncellendi. Güvenlik için tekrar giriş yapın.",
        color: "green",
      });
      setAccessToken(null);
      (document.getElementById("profile-change-password-form") as HTMLFormElement)?.reset();
      router.replace("/login");
    },
    onError: (err: { response?: { data?: { message?: string; code?: string } } }) => {
      const msg = err?.response?.data?.message ?? err?.response?.data?.code ?? "Şifre güncellenemedi.";
      notifications.show({ title: "Hata", message: msg, color: "red" });
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const currentPassword = (form.elements.namedItem("currentPassword") as HTMLInputElement)?.value;
    const newPassword = (form.elements.namedItem("newPassword") as HTMLInputElement)?.value;
    const confirm = (form.elements.namedItem("confirmNewPassword") as HTMLInputElement)?.value;
    if (!currentPassword || !newPassword) {
      notifications.show({ title: "Hata", message: "Mevcut ve yeni şifre zorunludur.", color: "red" });
      return;
    }
    if (newPassword.length < 8) {
      notifications.show({ title: "Hata", message: "Yeni şifre en az 8 karakter olmalıdır.", color: "red" });
      return;
    }
    if (newPassword !== confirm) {
      notifications.show({ title: "Hata", message: "Yeni şifre ile tekrarı eşleşmiyor.", color: "red" });
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  }

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Yönetici",
    MANAGER: "Müdür",
    EMPLOYEE: "Çalışan",
  };

  return (
    <Stack>
      <Stack gap={2}>
        <Badge variant="light" w="fit-content">PROFİL</Badge>
        <Title order={2}>Hesap Bilgileri</Title>
        <Text c="dimmed" size="sm">Kişisel ve iş bilgilerinizi görüntüleyin.</Text>
      </Stack>

      {/* Kullanıcı Kimlik Kartı */}
      <Card withBorder radius="md" p="md" className="gradient-card">
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">Ad Soyad</Text>
              <Text fw={700} size="lg">{me?.name ?? "—"}</Text>
              <Text size="sm" c="dimmed">E-posta</Text>
              <Text fw={600}>{me?.email ?? "—"}</Text>
              <Text size="sm" c="dimmed">Rol</Text>
              <Badge variant="gradient" gradient={{ from: 'indigo', to: 'violet' }} w="fit-content" size="lg">
                {ROLE_LABELS[me?.role ?? ""] ?? me?.role ?? "—"}
              </Badge>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="xs">
              <Group gap="xs" align="center">
                <ThemeIcon variant="light" color="grape" radius="xl" size="sm">
                  <IconBuilding size={14} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">Departman</Text>
              </Group>
              <Text fw={600} ml={30}>{emp?.department ?? "Tanımsız"}</Text>

              <Group gap="xs" align="center">
                <ThemeIcon variant="light" color="indigo" radius="xl" size="sm">
                  <IconBriefcase size={14} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">Pozisyon</Text>
              </Group>
              <Text fw={600} ml={30}>{emp?.position ?? "Tanımsız"}</Text>

              {emp?.phone && (
                <>
                  <Text size="sm" c="dimmed">Telefon</Text>
                  <Text fw={600}>{emp.phone}</Text>
                </>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Card>

      {/* İş Detayları */}
      {emp && (
        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder radius="md" p="md">
              <Group gap="xs" mb="xs">
                <ThemeIcon variant="light" color="teal" radius="xl" size="sm">
                  <IconCoin size={14} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">Saatlik Ücret</Text>
              </Group>
              <Title order={3}>
                {emp.hourlyRate ? `₺${Number(emp.hourlyRate).toFixed(2)}` : "Tanımsız"}
              </Title>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder radius="md" p="md">
              <Group gap="xs" mb="xs">
                <ThemeIcon variant="light" color="orange" radius="xl" size="sm">
                  <IconClock size={14} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">Haftalık Limit</Text>
              </Group>
              <Title order={3}>{emp.maxWeeklyHours ?? 45} saat</Title>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder radius="md" p="md">
              <Group gap="xs" mb="xs">
                <ThemeIcon variant="light" color="violet" radius="xl" size="sm">
                  <IconCalendar size={14} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">İşe Giriş</Text>
              </Group>
              <Title order={3}>
                {emp.hireDate
                  ? new Date(emp.hireDate).toLocaleDateString("tr-TR")
                  : "Belirtilmemiş"}
              </Title>
            </Card>
          </Grid.Col>
        </Grid>
      )}

      {/* İzin Bakiyeleri */}
      {balances.length > 0 && (
        <Card withBorder radius="md" p="md">
          <Title order={4} mb="sm">İzin Bakiyeleri ({currentYear})</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {balances.map((b) => {
              const total = b.accruedMinutes + b.carryMinutes + b.adjustedMinutes;
              const remaining = total - b.usedMinutes;
              const totalDays = total / (8 * 60);
              const remainingDays = remaining / (8 * 60);
              const percent = total > 0 ? (remaining / total) * 100 : 0;
              return (
                <Card key={b.id} withBorder radius="md" p="sm">
                  <Text size="sm" fw={600} mb="xs">
                    {b.leaveType?.name || b.leaveCode}
                  </Text>
                  <Group justify="space-between" mb={4}>
                    <Text size="xs" c="dimmed">Kalan Hak:</Text>
                    <Text size="sm" fw={700} c={percent < 20 ? "red" : "blue"}>
                      {Number.isInteger(remainingDays) ? remainingDays : remainingDays.toFixed(1)} Gün
                    </Text>
                  </Group>
                  <Progress value={Math.max(0, percent)} size="sm" color={percent < 20 ? "red" : "blue"} mb={4} />
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Toplam: {Number.isInteger(totalDays) ? totalDays : totalDays.toFixed(1)}</Text>
                    <Text size="xs" c="dimmed">Kullanılan: {Number.isInteger(b.usedMinutes / 480) ? (b.usedMinutes / 480) : +(b.usedMinutes / 480).toFixed(1)}</Text>
                  </Group>
                </Card>
              );
            })}
          </SimpleGrid>
        </Card>
      )}

      {/* Şifre Değiştir */}
      <Card withBorder radius="md" p="md">
        <Title order={4} mb="sm">Şifre değiştir</Title>
        <Alert color="blue" variant="light" mb="md">
          İlk kez geçici şifre ile giriş yaptıysanız, güvenliğiniz için şifrenizi buradan değiştirmeniz önerilir.
        </Alert>
        <form id="profile-change-password-form" onSubmit={handleSubmit}>
          <Stack>
            <PasswordInput
              name="currentPassword"
              label="Mevcut şifre"
              placeholder="Mevcut şifrenizi girin"
              required
            />
            <PasswordInput
              name="newPassword"
              label="Yeni şifre"
              placeholder="En az 8 karakter"
              required
              minLength={8}
            />
            <PasswordInput
              name="confirmNewPassword"
              label="Yeni şifre (tekrar)"
              placeholder="Yeni şifrenizi tekrar girin"
              required
            />
            <Button type="submit" loading={changePassword.isPending}>
              Şifreyi güncelle
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
