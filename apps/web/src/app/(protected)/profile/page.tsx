"use client";

import { Alert, Button, Card, PasswordInput, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../hooks/use-auth";
import { api } from "../../../lib/api";
import { setAccessToken } from "../../../lib/token-store";

export default function ProfilePage() {
  const router = useRouter();
  const { data: me } = useAuth();

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

  return (
    <Stack>
      <Title order={2}>Profil</Title>

      <Card withBorder radius="md" p="md">
        <Stack gap="xs">
          <Text size="sm" c="dimmed">E-posta</Text>
          <Text fw={600}>{me?.email ?? "—"}</Text>
          <Text size="sm" c="dimmed">Ad</Text>
          <Text fw={600}>{me?.name ?? "—"}</Text>
          <Text size="sm" c="dimmed">Rol</Text>
          <Text fw={600}>{me?.role ?? "—"}</Text>
        </Stack>
      </Card>

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
