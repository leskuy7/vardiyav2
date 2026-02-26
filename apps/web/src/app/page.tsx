"use client";

import { Badge, Button, Container, Grid, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCalendarWeek, IconChartBar, IconUsers } from '@tabler/icons-react';
import { ThemeToggle } from '../components/theme-toggle';

export default function HomePage() {
  return (
    <Container size="xl" py={56}>
      <Stack gap="lg">
        <Group justify="flex-end" mb="xs">
          <ThemeToggle />
        </Group>

        <Paper withBorder radius="xl" p={{ base: 'lg', md: 'xl' }}>
          <Grid gutter="xl" align="stretch">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md" justify="center" h="100%">
                <Badge variant="light" w="fit-content">Vardiya Yönetimi</Badge>
                <Title order={1} maw={560}>Ekibinizi akıllıca yönetin.</Title>
                <Text c="dimmed" size="lg" maw={620}>
                  Sürükle-bırak planlama, çalışan takibi ve haftalık raporları tek platformda yönet.
                </Text>

                <Stack gap="sm" mt="sm">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon variant="light" radius="xl"><IconCalendarWeek size={16} /></ThemeIcon>
                    <Stack gap={0}>
                      <Text fw={600}>Haftalık Planlama</Text>
                      <Text size="sm" c="dimmed">Sürükle-bırak ile hızlı vardiya düzenleme</Text>
                    </Stack>
                  </Group>
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon variant="light" radius="xl"><IconUsers size={16} /></ThemeIcon>
                    <Stack gap={0}>
                      <Text fw={600}>Çalışan Takibi</Text>
                      <Text size="sm" c="dimmed">Rol, uygunluk ve saat yönetimi tek akışta</Text>
                    </Stack>
                  </Group>
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon variant="light" radius="xl"><IconChartBar size={16} /></ThemeIcon>
                    <Stack gap={0}>
                      <Text fw={600}>Raporlama</Text>
                      <Text size="sm" c="dimmed">Maliyet ve fazla mesai görünürlüğü</Text>
                    </Stack>
                  </Group>
                </Stack>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper withBorder radius="lg" p="xl" h="100%">
                <Stack justify="space-between" h="100%" gap="lg">
                  <Stack gap={4}>
                    <Group justify="space-between" align="center">
                      <Title order={3}>Hızlı Giriş</Title>
                      <Badge variant="light">BETA</Badge>
                    </Group>
                    <Text c="dimmed" size="sm">
                      Demo hesaba geçip plan ve rapor ekranlarını anında görüntüleyebilirsin.
                    </Text>
                  </Stack>

                  <Stack>
                    <Button component="a" href="/login" size="md" fullWidth>
                      Sisteme Giriş
                    </Button>
                    <Group grow>
                      <Button component="a" href="/login?demo=admin" variant="light">Admin</Button>
                      <Button component="a" href="/login?demo=manager" variant="light">Müdür</Button>
                      <Button component="a" href="/login?demo=employee" variant="light">Çalışan</Button>
                    </Group>
                  </Stack>
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>
        </Paper>

        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper withBorder radius="md" p="lg">
              <Title order={4}>Haftalık Program</Title>
              <Text c="dimmed" mt={6}>Grid yapısında hızlı vardiya atama ve düzenleme.</Text>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper withBorder radius="md" p="lg">
              <Title order={4}>Rol Bazlı Erişim</Title>
              <Text c="dimmed" mt={6}>Admin, müdür ve çalışan için ayrı deneyim katmanı.</Text>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper withBorder radius="md" p="lg">
              <Title order={4}>Raporlama</Title>
              <Text c="dimmed" mt={6}>Haftalık saat, mesai ve maliyet kararlarını hızlandır.</Text>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
