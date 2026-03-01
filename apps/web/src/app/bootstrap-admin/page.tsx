"use client";

import {
  Alert,
  Button,
  Container,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../lib/api";
import { setAccessToken } from "../../lib/token-store";

const BUSINESS_TYPES = [
  { value: "RESTAURANT", label: "Restoran" },
  { value: "HOTEL", label: "Otel" },
  { value: "FACTORY", label: "Fabrika" },
  { value: "RETAIL", label: "Perakende" },
  { value: "OFFICE", label: "Ofis" },
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
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : "Bootstrap başarısız.";
      setError(msg ?? "Bootstrap başarısız.");
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
              İşletme ve admin hesabı oluşturuldu. Aşağıdaki giriş bilgilerini kaydedin; şifre tekrar gösterilmeyecektir.
            </Alert>
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
              İşletme: {result.organization.name} ({result.organization.businessTypeCode})
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
            <Title order={2}>Bootstrap Admin</Title>
            <Text size="sm" c="dimmed">
              Sadece geçerli bootstrap anahtarı ile ilk admin hesabı ve işletme oluşturulur.
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
            />
            <TextInput
              label="İşletme adı (isteğe bağlı)"
              placeholder="Varsayılan: işletme tipi adı"
              {...form.getInputProps("organizationName")}
            />
            <TextInput
              label="Admin adı (isteğe bağlı)"
              placeholder="Varsayılan: Admin"
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
