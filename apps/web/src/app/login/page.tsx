"use client";

import { Alert, Badge, Button, Container, Grid, Group, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { AxiosError } from 'axios';
import React, { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '../../components/theme-toggle';
import { api } from '../../lib/api';
import { setAccessToken } from '../../lib/token-store';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const formRef = React.useRef<HTMLFormElement>(null);

  const demoAccounts = [
    { label: 'Admin', email: 'admin@test.local', password: 'Test12345!' },
    { label: 'Müdür', email: 'manager@test.local', password: 'Test12345!' },
    { label: 'Çalışan', email: 'employee@test.local', password: 'Test12345!' }
  ];

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const demo = new URLSearchParams(window.location.search).get('demo');
    const selected =
      demo === 'admin'
        ? demoAccounts[0]
        : demo === 'manager'
          ? demoAccounts[1]
          : demo === 'employee'
            ? demoAccounts[2]
            : null;

    if (selected) {
      setEmail(selected.email);
      setPassword(selected.password);
      setActiveTab('login');
      // Auto-submit after a short delay to let state update
      setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 300);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      setAccessToken(response.data.accessToken);
      const role = response.data.user?.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
      router.push(role === 'EMPLOYEE' ? '/my-shifts' : '/dashboard');
    } catch (caughtError) {
      const axiosError = caughtError as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? 'Giriş başarısız.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container size="lg" py={64}>
      <Stack align="flex-end" mb="md">
        <ThemeToggle />
      </Stack>

      <Paper withBorder radius="lg" p={{ base: 'lg', md: 'xl' }} maw={980} mx="auto">
        <Grid gutter="xl" align="stretch">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack justify="center" h="100%" gap="md">
              <Badge variant="light" w="fit-content">Vardiya Platformu</Badge>
              <Title order={1}>Operasyonunu tek panelden yönet</Title>
              <Text c="dimmed">
                Vardiya atama, raporlama, çalışan takibi ve onay süreçlerini merkezi olarak yönet.
              </Text>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 7 }}>
            <Paper withBorder radius="md" p="xl">
              <form ref={formRef} onSubmit={handleSubmit}>
                <Stack>
                  <Group justify="space-between" align="center">
                    <Title order={3}>Hızlı Giriş</Title>
                    <Badge variant="light">BETA</Badge>
                  </Group>

                  <Group grow>
                    <Button
                      variant={activeTab === 'login' ? 'filled' : 'light'}
                      onClick={() => setActiveTab('login')}
                      type="button"
                    >
                      Giriş
                    </Button>
                    <Button
                      variant={activeTab === 'register' ? 'filled' : 'light'}
                      onClick={() => setActiveTab('register')}
                      type="button"
                    >
                      Kayıt
                    </Button>
                  </Group>

                  {activeTab === 'register' ? (
                    <Alert color="blue" variant="light">
                      Kayıt akışı bir sonraki fazda açılacak. Şimdilik demo hesaplarla giriş yapabilirsin.
                    </Alert>
                  ) : null}

                  <TextInput
                    label="E-posta"
                    description="İş e-postan ile giriş yap"
                    placeholder="admin@shiftplanner.com"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    leftSection="@"
                    size="md"
                    radius="md"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />

                  <PasswordInput
                    label="Şifre"
                    placeholder="Şifren"
                    name="password"
                    autoComplete="current-password"
                    size="md"
                    radius="md"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />

                  <Button type="submit" fullWidth size="md" loading={submitting}>
                    Giriş Yap
                  </Button>

                  <Stack gap="xs">
                    <Text size="xs" c="dimmed" ta="center">
                      Demo Hesaplar
                    </Text>
                    <Group grow>
                      {demoAccounts.map((account) => (
                        <Button
                          key={account.label}
                          variant="light"
                          type="button"
                          onClick={() => {
                            setEmail(account.email);
                            setPassword(account.password);
                            setActiveTab('login');
                          }}
                        >
                          {account.label}
                        </Button>
                      ))}
                    </Group>
                  </Stack>

                  {error ? <Alert color="red">{error}</Alert> : null}
                </Stack>
              </form>
            </Paper>
          </Grid.Col>
        </Grid>
      </Paper>
    </Container>
  );
}
