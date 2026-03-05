"use client";

import { Badge, Button, Card, Grid, Group, ScrollArea, Select, Stack, Table, Tabs, Text, TextInput, Title } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconDownload, IconRefresh } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { currentWeekStartIsoDate, formatWeekRange, shiftIsoDate } from '../../../lib/time';
import { PageEmpty, PageError, PageLoading } from '../../../components/page-states';
import { useAuth } from '../../../hooks/use-auth';
import { useAuditTrail, useComplianceViolations, useSecurityEvents } from '../../../hooks/use-reports';
import { useOvertime } from '../../../hooks/use-overtime';

function csvCell(value: unknown) {
  const s = String(value ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

export default function ReportsPage() {
  const [weekStart, setWeekStart] = useState(currentWeekStartIsoDate());
  const [strategy, setStrategy] = useState<"PLANNED" | "ACTUAL">("ACTUAL");
  const [securityDirective, setSecurityDirective] = useState('');
  const [securityFrom, setSecurityFrom] = useState('');
  const [securityTo, setSecurityTo] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [auditEntityType, setAuditEntityType] = useState('');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const { data: me } = useAuth();

  const { weeklyOvertimeQuery, recalculateOvertime } = useOvertime();
  const { data: overtimeData, isLoading, isError } = weeklyOvertimeQuery(weekStart, strategy);

  const { data: complianceData, isLoading: complianceLoading } = useComplianceViolations(weekStart);
  const isAdmin = me?.role === 'ADMIN';
  const {
    data: securityEvents,
    isLoading: securityLoading,
    isError: securityError
  } = useSecurityEvents(isAdmin, {
    limit: 100,
    directive: securityDirective,
    from: securityFrom,
    to: securityTo
  });
  const {
    data: auditTrail,
    isLoading: auditLoading,
    isError: auditError
  } = useAuditTrail(Boolean(me?.role === 'ADMIN' || me?.role === 'MANAGER'), {
    limit: 150,
    action: auditAction,
    entityType: auditEntityType,
    from: auditFrom,
    to: auditTo
  });

  const securitySummary = useMemo(() => {
    const events = securityEvents ?? [];
    const high = events.filter((event) => event.severity === 'HIGH').length;
    const medium = events.filter((event) => event.severity === 'MEDIUM').length;
    const low = events.filter((event) => event.severity === 'LOW').length;

    const topDirectiveMap = new Map<string, number>();
    for (const event of events) {
      const directive = event.violatedDirective ?? event.effectiveDirective ?? '-';
      topDirectiveMap.set(directive, (topDirectiveMap.get(directive) ?? 0) + 1);
    }

    const topDirective = Array.from(topDirectiveMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';

    return {
      total: events.length,
      high,
      medium,
      low,
      topDirective
    };
  }, [securityEvents]);

  const auditSummary = useMemo(() => {
    const events = auditTrail ?? [];
    const actionMap = new Map<string, number>();
    for (const event of events) {
      actionMap.set(event.action, (actionMap.get(event.action) ?? 0) + 1);
    }
    const topAction = Array.from(actionMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
    return { total: events.length, topAction };
  }, [auditTrail]);

  const auditActionOptions = useMemo(() => {
    const events = auditTrail ?? [];
    return Array.from(new Set(events.map((event) => event.action)))
      .sort((a, b) => a.localeCompare(b))
      .map((action) => ({ value: action, label: action }));
  }, [auditTrail]);

  const auditEntityOptions = useMemo(() => {
    const events = auditTrail ?? [];
    return Array.from(new Set(events.map((event) => event.entityType)))
      .sort((a, b) => a.localeCompare(b))
      .map((entityType) => ({ value: entityType, label: entityType }));
  }, [auditTrail]);

  function severityColor(value: 'HIGH' | 'MEDIUM' | 'LOW') {
    if (value === 'HIGH') return 'red';
    if (value === 'MEDIUM') return 'yellow';
    return 'blue';
  }

  const handleRecalculate = () => {
    recalculateOvertime.mutate({ weekStart, strategy });
  };

  const totals = useMemo(() => {
    if (!overtimeData) return { hours: 0, overtime: 0, cost: 0 };
    return overtimeData.reduce((acc, row) => ({
      hours: acc.hours + ((row.regularMinutes + row.overtimeMinutes) / 60),
      overtime: acc.overtime + (row.overtimeMinutes / 60),
      cost: acc.cost + (row.estimatedPay || 0),
    }), { hours: 0, overtime: 0, cost: 0 });
  }, [overtimeData]);

  if (isLoading && !overtimeData) return <PageLoading />;
  if (isError) return <PageError message="Rapor yüklenemedi." />;

  return (
    <Stack>
      <Group justify="space-between" align="center" wrap="wrap">
        <Stack gap={2}>
          <Group gap="xs">
            <Badge variant="light">RAPORLAR</Badge>
            <Text c="dimmed" size="sm">{new Date().toLocaleDateString('tr-TR')}</Text>
          </Group>
          <Title order={2}>Haftalık Saat Raporu</Title>
          <Text c="dimmed" size="sm">Bu hafta toplam saat, mesai ve maliyet görünümü.</Text>
        </Stack>

        <Group>
          <Button variant="light" onClick={() => setWeekStart((value) => shiftIsoDate(value, -7))}>Önceki</Button>
          <Badge size="lg" variant="light">{formatWeekRange(weekStart)}</Badge>
          <Button variant="light" onClick={() => setWeekStart((value) => shiftIsoDate(value, 7))}>Sonraki</Button>
        </Group>
      </Group>

      <Tabs value={strategy} onChange={(v) => setStrategy(v as "PLANNED" | "ACTUAL")}>
        <Tabs.List mb="md">
          <Tabs.Tab value="ACTUAL">Gerçekleşen (Puantaj)</Tabs.Tab>
          <Tabs.Tab value="PLANNED">Planlanan (Vardiya)</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={strategy}>
          <Group justify="flex-end" mb="md">
            <Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={handleRecalculate} loading={recalculateOvertime.isPending}>
              Yeniden Hesapla
            </Button>
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={() => {
                if (!overtimeData) return;
                const headers = ['Çalışan', 'Normal Saat', 'Toplam Saat', 'Fazla Mesai', 'Maliyet'];
                const rows = overtimeData.map((r) => [
                  r.employee?.user.name || "Bilinmeyen",
                  (r.regularMinutes / 60).toFixed(2),
                  ((r.regularMinutes + r.overtimeMinutes) / 60).toFixed(2),
                  (r.overtimeMinutes / 60).toFixed(2),
                  (r.estimatedPay || 0).toFixed(2)
                ]);
                const csv = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
                const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rapor_${weekStart}_${strategy}.csv`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              CSV İndir
            </Button>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">Toplam Saat</Text>
                <Title order={3}>{totals.hours.toFixed(2)}</Title>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">Toplam Fazla Mesai</Text>
                <Title order={3}>{totals.overtime.toFixed(2)}</Title>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">Toplam Maliyet</Text>
                <Title order={3}>₺{totals.cost.toFixed(2)}</Title>
              </Card>
            </Grid.Col>
          </Grid>

          {!overtimeData || overtimeData.length === 0 ? (
            <PageEmpty title="Rapor verisi bulunamadı" description="Seçilen strateji ve hafta için mesai kaydı hesaplanmamış." />
          ) : (
            <ScrollArea>
              <Table withTableBorder striped="odd" highlightOnHover verticalSpacing="md" horizontalSpacing="sm" mt="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Çalışan</Table.Th>
                    <Table.Th>Normal Saat</Table.Th>
                    <Table.Th>Toplam Saat</Table.Th>
                    <Table.Th>Fazla Mesai</Table.Th>
                    <Table.Th>Maliyet</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {overtimeData.map((row) => (
                    <Table.Tr key={row.id}>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text fw={600}>{row.employee?.user.name}</Text>
                          <Text c="dimmed" size="xs">#{row.employeeId.slice(0, 8)}</Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>{(row.regularMinutes / 60).toFixed(2)}</Table.Td>
                      <Table.Td>{((row.regularMinutes + row.overtimeMinutes) / 60).toFixed(2)}</Table.Td>
                      <Table.Td>{(row.overtimeMinutes / 60).toFixed(2)}</Table.Td>
                      <Table.Td>₺{(row.estimatedPay || 0).toFixed(2)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Tabs.Panel>
      </Tabs>

      <Stack gap="sm">
        <Title order={3}>Uyum İhlalleri (ÇSGB / 4857)</Title>
        <Text c="dimmed" size="sm">
          Seçilen haftada haftalık max saat aşımı veya 24 saat kesintisiz dinlenme ihlali olan çalışanlar.
        </Text>
        {complianceLoading ? (
          <Text c="dimmed" size="sm">Yükleniyor...</Text>
        ) : (complianceData?.violations ?? []).length === 0 ? (
          <Text c="dimmed" size="sm">Bu hafta ihlal kaydı yok.</Text>
        ) : (
          <ScrollArea>
            <Table withTableBorder striped="odd" highlightOnHover verticalSpacing="sm" horizontalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Çalışan</Table.Th>
                  <Table.Th>Max saat aşımı</Table.Th>
                  <Table.Th>24 saat dinlenme</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(complianceData?.violations ?? []).map((v) => (
                  <Table.Tr key={v.employeeId}>
                    <Table.Td>
                      <Stack gap={0}>
                        <Text fw={600}>{v.employeeName}</Text>
                        <Text c="dimmed" size="xs">#{v.employeeId.slice(0, 8)}</Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      {v.maxHoursViolation != null ? (
                        <Badge color="red" variant="light">+{v.maxHoursViolation} saat</Badge>
                      ) : (
                        <Text c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {v.no24hRest ? (
                        <Badge color="orange" variant="light">İhlal</Badge>
                      ) : (
                        <Text c="dimmed">—</Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Stack>

      {isAdmin ? (
        <Stack>
          <Group justify="space-between" align="center">
            <Title order={3}>Güvenlik Olayları (CSP)</Title>
            <Group>
              <Badge variant="light">Son 100 kayıt</Badge>
              <Button
                variant="light"
                leftSection={<IconDownload size={16} />}
                onClick={() => {
                  const events = securityEvents ?? [];
                  if (events.length === 0) return;

                  const headers = ['Zaman', 'Directive', 'Blocked URI', 'Document URI', 'IP'];
                  const rows = events.map((event) => [
                    new Date(event.createdAt).toLocaleString('tr-TR'),
                    event.violatedDirective ?? event.effectiveDirective ?? '',
                    event.blockedUri ?? '',
                    event.documentUri ?? '',
                    event.sourceIp ?? ''
                  ]);

                  const csv = [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n');
                  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = `security_events_${new Date().toISOString().slice(0, 10)}.csv`;
                  anchor.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                CSV İndir
              </Button>
            </Group>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">Toplam Olay</Text>
                <Title order={3}>{securitySummary.total}</Title>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">Yüksek Kritiklik</Text>
                <Title order={3} c="red">{securitySummary.high}</Title>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">Orta Kritiklik</Text>
                <Title order={3} c="yellow">{securitySummary.medium}</Title>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">En Sık Directive</Text>
                <Text fw={700}>{securitySummary.topDirective}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Directive Filtre"
                placeholder="script-src, img-src..."
                value={securityDirective}
                onChange={(event) => setSecurityDirective(event.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <DateInput
                label="Başlangıç Tarihi"
                placeholder="Başlangıç tarihi seçin"
                value={securityFrom ? new Date(securityFrom) : null}
                onChange={(val) => setSecurityFrom(val ? val.toISOString().slice(0, 10) : '')}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <DateInput
                label="Bitiş Tarihi"
                placeholder="Bitiş tarihi seçin"
                value={securityTo ? new Date(securityTo) : null}
                onChange={(val) => setSecurityTo(val ? val.toISOString().slice(0, 10) : '')}
                clearable
              />
            </Grid.Col>
          </Grid>

          {securityLoading ? (
            <Text c="dimmed" size="sm">Güvenlik olayları yükleniyor...</Text>
          ) : securityError ? (
            <Text c="red" size="sm">Güvenlik olayları yüklenemedi.</Text>
          ) : (securityEvents ?? []).length === 0 ? (
            <PageEmpty title="Güvenlik olayı yok" description="Henüz CSP ihlal kaydı oluşmadı." />
          ) : (
            <ScrollArea>
              <Table withTableBorder striped="odd" highlightOnHover verticalSpacing="sm" horizontalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Zaman</Table.Th>
                    <Table.Th>Kritiklik</Table.Th>
                    <Table.Th>Directive</Table.Th>
                    <Table.Th>Blocked URI</Table.Th>
                    <Table.Th>Document URI</Table.Th>
                    <Table.Th>IP</Table.Th>
                    <Table.Th>Öneri</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(securityEvents ?? []).map((event) => (
                    <Table.Tr key={event.id}>
                      <Table.Td>{new Date(event.createdAt).toLocaleString('tr-TR')}</Table.Td>
                      <Table.Td>
                        <Badge color={severityColor(event.severity)} variant="light">
                          {event.severity}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{event.violatedDirective ?? event.effectiveDirective ?? '-'}</Table.Td>
                      <Table.Td>{event.blockedUri ?? '-'}</Table.Td>
                      <Table.Td>{event.documentUri ?? '-'}</Table.Td>
                      <Table.Td>{event.sourceIp ?? '-'}</Table.Td>
                      <Table.Td>{event.recommendation}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Stack>
      ) : null}

      {(me?.role === 'ADMIN' || me?.role === 'MANAGER') ? (
        <Stack>
          <Group justify="space-between" align="center">
            <Title order={3}>Denetim Kaydı (Audit Trail)</Title>
            <Group>
              <Badge variant="light">Son 150 kayıt</Badge>
              <Button
                variant="light"
                leftSection={<IconDownload size={16} />}
                onClick={() => {
                  const events = auditTrail ?? [];
                  if (events.length === 0) return;
                  const headers = ['Zaman', 'Aksiyon', 'Kullanıcı', 'Rol', 'Entity', 'Entity ID'];
                  const rows = events.map((event) => [
                    new Date(event.createdAt).toLocaleString('tr-TR'),
                    event.action,
                    event.user?.name ?? event.user?.email ?? event.userId,
                    event.user?.role ?? '-',
                    event.entityType,
                    event.entityId
                  ]);
                  const csv = [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n');
                  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
                  anchor.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                CSV İndir
              </Button>
            </Group>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">Toplam Olay</Text>
                <Title order={3}>{auditSummary.total}</Title>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">En Sık Aksiyon</Text>
                <Text fw={700}>{auditSummary.topAction}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                label="Aksiyon"
                placeholder="Tümü"
                data={auditActionOptions}
                value={auditAction || null}
                onChange={(value) => setAuditAction(value ?? '')}
                clearable
                searchable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                label="Entity"
                placeholder="Tümü"
                data={auditEntityOptions}
                value={auditEntityType || null}
                onChange={(value) => setAuditEntityType(value ?? '')}
                clearable
                searchable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Başlangıç Tarihi"
                placeholder="Başlangıç tarihi seçin"
                value={auditFrom ? new Date(auditFrom) : null}
                onChange={(val) => setAuditFrom(val ? val.toISOString().slice(0, 10) : '')}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Bitiş Tarihi"
                placeholder="Bitiş tarihi seçin"
                value={auditTo ? new Date(auditTo) : null}
                onChange={(val) => setAuditTo(val ? val.toISOString().slice(0, 10) : '')}
                clearable
              />
            </Grid.Col>
          </Grid>

          {auditLoading ? (
            <Text c="dimmed" size="sm">Denetim kayıtları yükleniyor...</Text>
          ) : auditError ? (
            <Text c="red" size="sm">Denetim kayıtları yüklenemedi.</Text>
          ) : (auditTrail ?? []).length === 0 ? (
            <PageEmpty title="Denetim kaydı yok" description="Seçili filtrelere uygun kayıt bulunamadı." />
          ) : (
            <ScrollArea>
              <Table withTableBorder striped="odd" highlightOnHover verticalSpacing="sm" horizontalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Zaman</Table.Th>
                    <Table.Th>Aksiyon</Table.Th>
                    <Table.Th>Kullanıcı</Table.Th>
                    <Table.Th>Entity</Table.Th>
                    <Table.Th>Entity ID</Table.Th>
                    <Table.Th>Detay</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(auditTrail ?? []).map((event) => (
                    <Table.Tr key={event.id}>
                      <Table.Td>{new Date(event.createdAt).toLocaleString('tr-TR')}</Table.Td>
                      <Table.Td><Badge variant="light">{event.action}</Badge></Table.Td>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text fw={600} size="sm">{event.user?.name ?? event.user?.email ?? event.userId}</Text>
                          <Text c="dimmed" size="xs">{event.user?.role ?? '-'}</Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>{event.entityType}</Table.Td>
                      <Table.Td>{event.entityId}</Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {JSON.stringify(event.details ?? {})}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Stack>
      ) : null}
    </Stack>
  );
}
