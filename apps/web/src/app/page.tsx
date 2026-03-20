import { Badge, Box, Button, Card, Container, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { ThemeToggle } from '../components/theme-toggle';

const features = [
  {
    title: 'Haftalık Planlama',
    description: 'Kafe ekibini haftalık grid üzerinden hızlıca planla, yayınla ve değiştir.',
  },
  {
    title: 'İzin Çakışma Kontrolü',
    description: 'Onaylı izinler planı korur, çakışan vardiyalar görünür ve operasyon aksamasını azaltır.',
  },
  {
    title: 'Puantaj ve Devamsızlık',
    description: 'Giriş-çıkış kayıtlarını, açık puantajları ve devamsızlık riskini aynı ekranda takip et.',
  },
  {
    title: 'PDF / Çıktı',
    description: 'Haftalık vardiya ve puantaj özetini CSV veya PDF olarak dışa aktar.',
  }
];

const packages = [
  {
    title: 'Kafe Starter',
    description: 'Tek şubeli kafeler için temel operasyon paketi.',
    highlights: 'Personel, vardiya, izin, puantaj, PDF çıktı',
  },
  {
    title: 'Kafe Chain',
    description: 'Küçük zincirler için ikinci faz genişleme yolu.',
    highlights: 'Şube görünürlüğü, çok lokasyonlu raporlama, büyüyen ekip akışı',
  },
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
                Kafeler İçin Operasyon Yönetimi
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
                Kafeler için <span className="gradient-text">personel, vardiya, izin ve puantaj</span> tek panelde.
              </Title>

              <Text size="lg" maw={640} style={{ color: 'rgba(199, 210, 254, 0.8)', lineHeight: 1.7 }}>
                Haftalık vardiya planını oluştur, izin çakışmalarını önle, puantajı kapat ve çıktını dakikalar içinde al.
              </Text>

              <Group mt="md">
                <Button component="a" href="/login?demo=admin" size="lg" variant="filled" color="indigo" radius="xl">
                  Demo Panelini Aç
                </Button>
                <Button component="a" href="/login?demo=manager" size="lg" variant="light" color="gray" radius="xl" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#c7d2fe' }}>
                  Müdür Senaryosunu Aç
                </Button>
              </Group>

              <Text size="sm" maw={560} style={{ color: 'rgba(199, 210, 254, 0.7)' }}>
                Self-serve kayıt yok. Demo panelini gördükten sonra kurulum ekibi bootstrap anahtarıyla işletmenizi canlıya alır.
              </Text>
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

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {packages.map((item) => (
              <Card key={item.title} withBorder p="xl" radius="xl" className="feature-card">
                <Stack gap="sm">
                  <Badge variant="light" color="teal" w="fit-content">Paket</Badge>
                  <Title order={3}>{item.title}</Title>
                  <Text c="dimmed" size="sm" lh={1.7}>{item.description}</Text>
                  <Text size="sm" fw={600}>{item.highlights}</Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>

          <Group justify="center" py="md">
            <Text c="dimmed" size="xs">© 2026 Vardiya Platformu — Kafe operasyonu için tasarlandı.</Text>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
