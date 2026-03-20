"use client";

import {
  Alert,
  Button,
  Container,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconCopy } from "@tabler/icons-react";
import { api, getErrorMessage } from "../../lib/api";
import { setAccessToken } from "../../lib/token-store";

const BUSINESS_TYPES = [
  { value: "RESTAURANT", label: "Kafe / Restoran" },
];

type BootstrapResult = {
  accessToken: string;
  user: { id: string; email: string; name: string; role: string };
  organization: { id: string; name: string; businessTypeCode: string };
  generatedEmail: string;
  generatedPassword: string;
};

export default function BootstrapAdminPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BootstrapResult | null>(null);

  const form = useForm({
    initialValues: {
      bootstrapKey: "",
      businessTypeCode: "RESTAURANT",
      organizationName: "",
      adminName: "",
    },
    validate: {
      bootstrapKey: (v) => (!v ? "Bootstrap anahtarı girin" : null),
    },
  });

  async function handleSubmit(values: typeof form.values) {
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post<BootstrapResult>("auth/bootstrap-admin", {
        businessTypeCode: values.businessTypeCode,
        organizationName: values.organizationName || undefined,
        adminName: values.adminName || undefined,
      }, {
        headers: { "X-Bootstrap-Key": values.bootstrapKey },
      });
      setResult(data);
      if (data.accessToken) {
        setAccessToken(data.accessToken);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Bootstrap başarısız."));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Container size="sm" py="xl">
        <Paper withBorder radius="md" p="xl" shadow="sm">
          <Stack gap="lg">
            <Title order={2}>Admin Hesabı Oluşturuldu</Title>
            <Alert color="green" title="Başarılı">
              Kafe kurulumu ve admin hesabı oluşturuldu. Aşağıdaki giriş bilgilerini kaydedin; şifre tekrar gösterilmeyecektir.
            </Alert>
            <Button
              variant="light"
              leftSection={<IconCopy size={18} />}
              onClick={() => {
                const text = `Kullanıcı adı: ${result.generatedEmail}, Şifre: ${result.generatedPassword}`;
                void navigator.clipboard.writeText(text).then(() => {
                  notifications.show({ title: "Kopyalandı", message: "Kullanıcı adı ve şifre panoya kopyalandı.", color: "green" });
                });
              }}
            >
              Tümünü kopyala
            </Button>
            <TextInput
              label="Kullanıcı adı"
              value={result.generatedEmail}
              readOnly
              styles={{ input: { fontFamily: "monospace", fontWeight: 600 } }}
            />
            <TextInput
              label="Geçici şifre"
              value={result.generatedPassword}
              readOnly
              type="text"
              styles={{ input: { fontFamily: "monospace", fontWeight: 600 } }}
            />
            <Text size="sm" c="dimmed">
              İşletme: {result.organization.name} ({result.organization.businessTypeCode === "RESTAURANT" ? "Kafe / Restoran" : result.organization.businessTypeCode})
            </Text>
            <Group>
              <Button onClick={() => router.push("/dashboard")}>
                Panele git
              </Button>
              <Button variant="light" onClick={() => router.push("/login")}>
                Giriş sayfasına git
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Paper withBorder radius="md" p="xl" shadow="sm">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            <Title order={2}>İç Kurulum Ekranı</Title>
            <Text size="sm" c="dimmed">
              Bu ekran self-serve kayıt için değildir. Demo veya kurulum görüşmesi sonrası paylaşılan bootstrap anahtarı ile ilk admin hesabı ve işletme kurulumu yapılır.
            </Text>
            {error && (
              <Alert color="red" title="Hata">
                {error}
              </Alert>
            )}
            <TextInput
              label="Bootstrap anahtarı"
              placeholder="X-Bootstrap-Key"
              type="password"
              {...form.getInputProps("bootstrapKey")}
            />
            <Select
              label="İşletme tipi"
              data={BUSINESS_TYPES}
              {...form.getInputProps("businessTypeCode")}
              disabled
            />
            <TextInput
              label="İşletme adı (isteğe bağlı)"
              placeholder="Örn. Moda Şubesi"
              {...form.getInputProps("organizationName")}
            />
            <TextInput
              label="Admin adı (isteğe bağlı)"
              placeholder="Örn. Kafe Müdürü"
              {...form.getInputProps("adminName")}
            />
            <Button type="submit" loading={submitting}>
              Admin oluştur
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
