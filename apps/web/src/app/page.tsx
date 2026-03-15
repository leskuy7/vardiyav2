import { Badge, Box, Button, Container, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { ThemeToggle } from '../components/theme-toggle';

const features = [
  {
    title: 'Haftalık Planlama',
    description: 'Sürükle-bırak grid ile anlık vardiya atama ve düzenleme.',
  },
  {
    title: 'Çalışan Takibi',
    description: 'Rol bazlı erişim, müsaitlik ve saat yönetimi.',
  },
  {
    title: 'Akıllı Raporlama',
    description: 'Haftalık saat, mesai ve maliyet analizleri.',
  },
  {
    title: 'Güvenli Yönetim',
    description: 'RBAC, CSRF koruması ve audit logging.',
  }
];

export default function HomePage() {
  return (
    <Box>
      <Container size="xl" py={40}>
        <Stack gap="xl">
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <Badge variant="light" className="badge-glow" size="lg">Vardiya v2</Badge>
            </Group>
            <Group gap="sm">
              <ThemeToggle />
              <Button component="a" href="/login" variant="filled" color="indigo" radius="xl">Giriş Yap</Button>
            </Group>
          </Group>

          <Paper className="hero-section" p={{ base: 'xl', md: 48 }}>
            <Stack gap="lg" style={{ position: 'relative', zIndex: 1 }}>
              <Badge
                variant="light"
                color="white"
                size="lg"
                style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.1)', color: '#c7d2fe' }}
              >
                Yeni Nesil Vardiya Yönetimi
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

              <Text size="lg" maw={640} style={{ color: 'rgba(199, 210, 254, 0.8)', lineHeight: 1.7 }}>
                Sürükle-bırak planlama, gerçek zamanlı takip, izin ve mesai kuralları ile operasyonu tek panelden yönetin.
              </Text>

              <Group mt="md">
                <Button component="a" href="/login" size="lg" variant="filled" color="indigo" radius="xl">
                  Hemen Başla
                </Button>
                <Button component="a" href="/login?demo=admin" size="lg" variant="light" color="gray" radius="xl" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#c7d2fe' }}>
                  Demo Dene
                </Button>
              </Group>
            </Stack>
          </Paper>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
            {features.map((feature, index) => (
              <Paper
                key={feature.title}
                withBorder
                p="xl"
                h="100%"
                className={`feature-card stagger-${index + 1}`}
                style={{ animationFillMode: 'both' }}
              >
                <Stack gap="sm">
                  <Badge variant="light" color="indigo" w="fit-content">Özellik</Badge>
                  <Title order={4}>{feature.title}</Title>
                  <Text c="dimmed" size="sm" lh={1.6}>{feature.description}</Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>

          <Group justify="center" py="md">
            <Text c="dimmed" size="xs">© 2026 Vardiya Platformu — Tüm hakları saklıdır.</Text>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
