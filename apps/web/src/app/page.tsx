"use client";

import { Badge, Box, Button, Container, Grid, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconArrowRight, IconCalendarWeek, IconChartBar, IconShieldCheck, IconUsers } from '@tabler/icons-react';
import Link from 'next/link';
import { ThemeToggle } from '../components/theme-toggle';

const features = [
  {
    icon: IconCalendarWeek,
    title: 'Haftalık Planlama',
    description: 'Sürükle-bırak grid ile anlık vardiya atama ve düzenleme.',
    color: 'indigo'
  },
  {
    icon: IconUsers,
    title: 'Çalışan Takibi',
    description: 'Rol bazlı erişim, müsaitlik ve saat yönetimi.',
    color: 'violet'
  },
  {
    icon: IconChartBar,
    title: 'Akıllı Raporlama',
    description: 'Haftalık saat, mesai ve maliyet analizleri.',
    color: 'grape'
  },
  {
    icon: IconShieldCheck,
    title: 'Güvenli Yönetim',
    description: 'RBAC, CSRF koruması ve audit logging.',
    color: 'teal'
  }
];

export default function HomePage() {
  return (
    <Box>
      <Container size="xl" py={40}>
        <Stack gap="xl">
          {/* Top bar */}
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <Badge variant="light" className="badge-glow" size="lg">Vardiya v2</Badge>
            </Group>
            <Group gap="sm">
              <ThemeToggle />
              <Button component={Link} href="/login" variant="filled" color="indigo" radius="xl">Giriş Yap</Button>
            </Group>
          </Group>

          {/* Hero */}
          <Paper className="hero-section" p={{ base: 'xl', md: 48 }}>
            <Grid gutter="xl" align="center">
              <Grid.Col span={{ base: 12, md: 7 }}>
                <Stack gap="lg" style={{ position: 'relative', zIndex: 1 }}>
                  <Badge
                    variant="light"
                    color="white"
                    size="lg"
                    style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.1)', color: '#c7d2fe' }}
                  >
                    ✨ Yeni Nesil Vardiya Yönetimi
                  </Badge>

                  <Title
                    order={1}
                    style={{
                      fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                      lineHeight: 1.15,
                      color: '#ffffff',
                      letterSpacing: '-0.02em'
                    }}
                  >
                    Ekibinizi <span className="gradient-text">akıllıca</span> yönetin.
                  </Title>

                  <Text
                    size="lg"
                    maw={520}
                    style={{ color: 'rgba(199, 210, 254, 0.8)', lineHeight: 1.7 }}
                  >
                    Sürükle-bırak planlama, gerçek zamanlı takip ve detaylı raporlarla
                    operasyonunu bir üst seviyeye taşı.
                  </Text>

                  <Group mt="md">
                    <Button
                      component={Link}
                      href="/login"
                      size="lg"
                      variant="filled"
                      color="indigo"
                      radius="xl"
                      rightSection={<IconArrowRight size={18} />}
                    >
                      Hemen Başla
                    </Button>
                    <Button
                      component={Link}
                      href="/login?demo=admin"
                      size="lg"
                      variant="light"
                      color="gray"
                      radius="xl"
                      style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#c7d2fe' }}
                    >
                      Demo Dene
                    </Button>
                  </Group>
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 5 }}>
                <Paper
                  radius="xl"
                  p="xl"
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    background: 'rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <Stack gap="lg">
                    <Group justify="space-between" align="center">
                      <Title order={3} style={{ color: '#fff' }}>Hızlı Giriş</Title>
                      <Badge variant="light" style={{ background: 'rgba(102, 126, 234, 0.3)', color: '#a5b4fc' }}>BETA</Badge>
                    </Group>
                    <Text size="sm" style={{ color: 'rgba(199, 210, 254, 0.7)' }}>
                      Demo hesapla plan, rapor ve çalışan ekranlarını keşfet.
                    </Text>

                    <Button component={Link} href="/login" size="md" fullWidth className="btn-gradient">
                      Sisteme Giriş
                    </Button>

                    <Group grow>
                      {[
                        { label: 'Admin', demo: 'admin' },
                        { label: 'Müdür', demo: 'manager' },
                        { label: 'Çalışan', demo: 'employee' }
                      ].map((item) => (
                        <Button
                          key={item.demo}
                          component={Link}
                          href={`/login?demo=${item.demo}`}
                          variant="default"
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            color: '#c7d2fe'
                          }}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </Group>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Features */}
          <Grid>
            {features.map((feature, index) => (
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={feature.title}>
                <Paper
                  withBorder
                  p="xl"
                  h="100%"
                  className={`feature-card stagger-${index + 1}`}
                  style={{ animationFillMode: 'both' }}
                >
                  <Stack gap="sm">
                    <ThemeIcon
                      variant="light"
                      color={feature.color}
                      size="xl"
                      radius="xl"
                    >
                      <feature.icon size={20} />
                    </ThemeIcon>
                    <Title order={4}>{feature.title}</Title>
                    <Text c="dimmed" size="sm" lh={1.6}>{feature.description}</Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            ))}
          </Grid>

          {/* Footer */}
          <Group justify="center" py="md">
            <Text c="dimmed" size="xs">© 2026 Vardiya Platformu — Tüm hakları saklıdır.</Text>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
