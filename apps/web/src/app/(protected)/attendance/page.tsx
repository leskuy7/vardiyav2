"use client";

import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertTriangle, IconClockHour4, IconDownload, IconRefresh } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { PageEmpty, PageError, PageLoading } from "../../../components/page-states";
import { useAuth } from "../../../hooks/use-auth";
import { useAttendanceSummary } from "../../../hooks/use-reports";
import { type TimeEntryRecord, useTimeEntriesList } from "../../../hooks/use-time-entries";
import {
  currentWeekStartIsoDate,
  formatDateDisplay,
  formatTimeOnly,
  formatWeekRange,
  shiftIsoDate,
} from "../../../lib/time";

function csvCell(value: unknown) {
  const s = String(value ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

function formatShiftRange(start: string, end: string) {
  return `${formatDateDisplay(start)} · ${formatTimeOnly(start)} - ${formatTimeOnly(end)}`;
}

function entryStatusColor(status: TimeEntryRecord["status"]) {
  if (status === "OPEN") return "orange";
  if (status === "CLOSED") return "green";
  return "gray";
}

export default function AttendancePage() {
  const [weekStart, setWeekStart] = useState(currentWeekStartIsoDate());
  const { data: me, isLoading: authLoading } = useAuth();
  const isAdminOrManager = me?.role === "ADMIN" || me?.role === "MANAGER";

  const {
    data: attendance,
    isLoading: attendanceLoading,
    isError: attendanceError,
  } = useAttendanceSummary(weekStart, isAdminOrManager);
  const {
    data: timeEntries = [],
    isLoading: timeEntriesLoading,
    isError: timeEntriesError,
  } = useTimeEntriesList({ weekStart }, isAdminOrManager);

  const isLoading = attendanceLoading || timeEntriesLoading;
  const isError = attendanceError || timeEntriesError;

  const exportCsv = () => {
    if (!attendance) return;

    const summaryRows = [
      ["Planlı Vardiya", attendance.scheduledShiftCount],
      ["Puantaj Kaydı", attendance.timeEntryCount],
      ["Açık Kayıt", attendance.openEntries],
      ["Eksik Giriş", attendance.missingEntries],
      ["Devamsızlık", attendance.absentShifts],
      ["Çıkış Yapmayan Personel", attendance.employeesWithoutCheckout],
    ];

    const entryRows = timeEntries.map((entry) => [
      entry.employee?.user?.name ?? "Bilinmeyen",
      entry.employee?.department ?? "-",
      formatDateDisplay(entry.checkInAt),
      formatTimeOnly(entry.checkInAt),
      entry.checkOutAt ? formatTimeOnly(entry.checkOutAt) : "-",
      entry.status,
      entry.shift ? formatShiftRange(entry.shift.startTime, entry.shift.endTime) : "-",
    ]);

    const absentRows = attendance.absentShiftItems.map((item) => [
      item.employeeName,
      item.department ?? "-",
      formatShiftRange(item.shiftStartTime, item.shiftEndTime),
      item.shiftStatus,
    ]);

    const csv = [
      "Haftalık Puantaj Özeti",
      `Hafta,${csvCell(formatWeekRange(weekStart))}`,
      "",
      "Özet",
      ...summaryRows.map((row) => row.map(csvCell).join(",")),
      "",
      "Haftalık Giriş Çıkış Kayıtları",
      ["Personel", "Departman", "Tarih", "Giriş", "Çıkış", "Durum", "Vardiya"].map(csvCell).join(","),
      ...entryRows.map((row) => row.map(csvCell).join(",")),
      "",
      "Devamsızlıklar",
      ["Personel", "Departman", "Vardiya", "Durum"].map(csvCell).join(","),
      ...absentRows.map((row) => row.map(csvCell).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `puantaj_ozeti_${weekStart}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportPdf = () => {
    if (!attendance) return;

    import("jspdf").then(({ default: jsPDF }) => {
      import("jspdf-autotable").then(({ default: autoTable }) => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Haftalik Puantaj Ozeti", 14, 20);
        doc.setFontSize(10);
        doc.text(`Hafta: ${formatWeekRange(weekStart)}`, 14, 28);

        autoTable(doc, {
          startY: 35,
          head: [["Metrik", "Deger"]],
          body: [
            ["Planli Vardiya", String(attendance.scheduledShiftCount)],
            ["Puantaj Kaydi", String(attendance.timeEntryCount)],
            ["Acik Kayit", String(attendance.openEntries)],
            ["Eksik Giris", String(attendance.missingEntries)],
            ["Devamsizlik", String(attendance.absentShifts)],
            ["Cikis Yapmayan Personel", String(attendance.employeesWithoutCheckout)],
          ],
        });

        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 10,
          head: [["Personel", "Departman", "Tarih", "Giris", "Cikis", "Durum"]],
          body: timeEntries.map((entry) => [
            entry.employee?.user?.name ?? "Bilinmeyen",
            entry.employee?.department ?? "-",
            formatDateDisplay(entry.checkInAt),
            formatTimeOnly(entry.checkInAt),
            entry.checkOutAt ? formatTimeOnly(entry.checkOutAt) : "-",
            entry.status,
          ]),
        });

        if (attendance.absentShiftItems.length > 0) {
          autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [["Personel", "Departman", "Vardiya", "Durum"]],
            body: attendance.absentShiftItems.map((item) => [
              item.employeeName,
              item.department ?? "-",
              formatShiftRange(item.shiftStartTime, item.shiftEndTime),
              item.shiftStatus,
            ]),
          });
        }

        doc.save(`puantaj_ozeti_${weekStart}.pdf`);
      });
    });
  };

  const employeeCoverageRows = useMemo(() => {
    return attendance?.employeeSummaries ?? [];
  }, [attendance]);

  if (authLoading && !me) return <PageLoading />;
  if (!isAdminOrManager && me) {
    return <PageError message="Puantaj özeti yalnızca yönetici ve admin rolü için gösterilir." />;
  }

  if (isLoading) return <PageLoading />;
  if (isError || !attendance) return <PageError message="Puantaj özeti yüklenemedi." />;

  return (
    <Stack>
      <Group justify="space-between" align="center" wrap="wrap">
        <Stack gap={2}>
          <Group gap="xs">
            <Badge variant="light">PUANTAJ</Badge>
            <Text c="dimmed" size="sm">
              {new Date().toLocaleDateString("tr-TR")}
            </Text>
          </Group>
          <Title order={2}>Kafe Puantaj Özeti</Title>
          <Text c="dimmed" size="sm">
            Haftalık giriş-çıkış kayıtlarını, eksik vardiyaları ve devamsızlık riskini tek ekrandan takip et.
          </Text>
        </Stack>

        <Group>
          <Button variant="light" onClick={() => setWeekStart((value) => shiftIsoDate(value, -7))}>
            Önceki
          </Button>
          <Badge size="lg" variant="light">
            {formatWeekRange(weekStart)}
          </Badge>
          <Button variant="light" onClick={() => setWeekStart((value) => shiftIsoDate(value, 7))}>
            Sonraki
          </Button>
        </Group>
      </Group>

      <Group justify="flex-end">
        <Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={() => window.location.reload()}>
          Yenile
        </Button>
        <Button variant="light" leftSection={<IconDownload size={16} />} onClick={exportCsv}>
          CSV Indir
        </Button>
        <Button variant="light" color="red" leftSection={<IconDownload size={16} />} onClick={exportPdf}>
          PDF Indir
        </Button>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, lg: 4, xl: 2 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Planlı Vardiya</Text>
            <Title order={3}>{attendance.scheduledShiftCount}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 4, xl: 2 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Puantaj Kaydı</Text>
            <Title order={3}>{attendance.timeEntryCount}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 4, xl: 2 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Açık Kayıt</Text>
            <Title order={3} c={attendance.openEntries > 0 ? "orange" : undefined}>
              {attendance.openEntries}
            </Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 6, xl: 3 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Eksik Giriş</Text>
            <Title order={3} c={attendance.missingEntries > 0 ? "orange" : undefined}>
              {attendance.missingEntries}
            </Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 6, xl: 3 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Devamsızlık</Text>
            <Title order={3} c={attendance.absentShifts > 0 ? "red" : undefined}>
              {attendance.absentShifts}
            </Title>
          </Card>
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <IconClockHour4 size={18} />
                <Title order={4}>Açık Puantaj Kayıtları</Title>
              </Group>
              <Badge color={attendance.openEntries > 0 ? "orange" : "gray"} variant="light">
                {attendance.openEntries}
              </Badge>
            </Group>

            {attendance.openEntryItems.length === 0 ? (
              <PageEmpty title="Açık kayıt yok" description="Tüm personelin çıkış işlemi tamamlanmış görünüyor." />
            ) : (
              <Stack gap="sm">
                {attendance.openEntryItems.map((item) => (
                  <Card key={item.id} withBorder radius="md" p="sm">
                    <Group justify="space-between" align="center">
                      <Stack gap={2}>
                        <Text fw={600}>{item.employeeName}</Text>
                        <Text size="sm" c="dimmed">
                          {item.department ?? "Departman yok"} · Giriş {formatDateDisplay(item.checkInAt)} {formatTimeOnly(item.checkInAt)}
                        </Text>
                        {item.shiftStartTime && item.shiftEndTime ? (
                          <Text size="xs" c="dimmed">
                            Bağlı vardiya: {formatShiftRange(item.shiftStartTime, item.shiftEndTime)}
                          </Text>
                        ) : null}
                      </Stack>
                      <Badge color="orange" variant="light">
                        Çıkış Bekliyor
                      </Badge>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <IconAlertTriangle size={18} />
                <Title order={4}>Eksik Girişler</Title>
              </Group>
              <Badge color={attendance.missingEntries > 0 ? "orange" : "gray"} variant="light">
                {attendance.missingEntries}
              </Badge>
            </Group>

            {attendance.missingEntryItems.length === 0 ? (
              <PageEmpty title="Eksik giriş yok" description="Planlı vardiyaların hepsi için puantaj veya izin kaydı bulundu." />
            ) : (
              <Stack gap="sm">
                {attendance.missingEntryItems.map((item) => (
                  <Card key={item.shiftId} withBorder radius="md" p="sm">
                    <Group justify="space-between" align="center">
                      <Stack gap={2}>
                        <Text fw={600}>{item.employeeName}</Text>
                        <Text size="sm" c="dimmed">
                          {item.department ?? "Departman yok"} · {formatShiftRange(item.shiftStartTime, item.shiftEndTime)}
                        </Text>
                      </Stack>
                      <Badge color={item.isAbsent ? "red" : "orange"} variant="light">
                        {item.isAbsent ? "Devamsızlık" : "Giriş Bekliyor"}
                      </Badge>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" mb="sm">
              <Title order={4}>Personel Kapsam Özeti</Title>
              <Badge variant="light">{employeeCoverageRows.length}</Badge>
            </Group>

            {employeeCoverageRows.length === 0 ? (
              <PageEmpty title="Personel özet verisi yok" />
            ) : (
              <ScrollArea>
                <Table withTableBorder striped="odd" highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Personel</Table.Th>
                      <Table.Th>Plan</Table.Th>
                      <Table.Th>Kayıt</Table.Th>
                      <Table.Th>Eksik</Table.Th>
                      <Table.Th>İzin</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {employeeCoverageRows.map((row) => (
                      <Table.Tr key={row.employeeId}>
                        <Table.Td>
                          <Stack gap={0}>
                            <Text fw={600} size="sm">{row.employeeName}</Text>
                            <Text size="xs" c="dimmed">{row.department ?? "-"}</Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>{row.scheduledShifts}</Table.Td>
                        <Table.Td>{row.matchedEntries}</Table.Td>
                        <Table.Td>{row.missingEntries}</Table.Td>
                        <Table.Td>{row.leaveProtectedShifts}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" mb="sm">
              <Title order={4}>Devamsızlık Listesi</Title>
              <Badge color={attendance.absentShifts > 0 ? "red" : "gray"} variant="light">
                {attendance.absentShifts}
              </Badge>
            </Group>

            {attendance.absentShiftItems.length === 0 ? (
              <PageEmpty title="Devamsızlık kaydı yok" description="Bu hafta için izinsiz eksik vardiya görünmüyor." />
            ) : (
              <Stack gap="sm">
                {attendance.absentShiftItems.map((item) => (
                  <Card key={item.shiftId} withBorder radius="md" p="sm">
                    <Group justify="space-between" align="center">
                      <Stack gap={2}>
                        <Text fw={600}>{item.employeeName}</Text>
                        <Text size="sm" c="dimmed">
                          {item.department ?? "Departman yok"} · {formatShiftRange(item.shiftStartTime, item.shiftEndTime)}
                        </Text>
                      </Stack>
                      <Badge color="red" variant="light">
                        Devamsız
                      </Badge>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" mb="sm">
          <Title order={4}>Haftalık Giriş Çıkış Kayıtları</Title>
          <Badge variant="light">{timeEntries.length}</Badge>
        </Group>

        {timeEntries.length === 0 ? (
          <PageEmpty title="Puantaj kaydı bulunmuyor" description="Seçilen hafta için giriş-çıkış kaydı oluşturulmamış." />
        ) : (
          <ScrollArea>
            <Table withTableBorder striped="odd" highlightOnHover verticalSpacing="sm" horizontalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Personel</Table.Th>
                  <Table.Th>Departman</Table.Th>
                  <Table.Th>Tarih</Table.Th>
                  <Table.Th>Giriş</Table.Th>
                  <Table.Th>Çıkış</Table.Th>
                  <Table.Th>Durum</Table.Th>
                  <Table.Th>Bağlı Vardiya</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {timeEntries.map((entry) => (
                  <Table.Tr key={entry.id}>
                    <Table.Td>
                      <Text fw={600}>{entry.employee?.user?.name ?? "Bilinmeyen"}</Text>
                    </Table.Td>
                    <Table.Td>{entry.employee?.department ?? "-"}</Table.Td>
                    <Table.Td>{formatDateDisplay(entry.checkInAt)}</Table.Td>
                    <Table.Td>{formatTimeOnly(entry.checkInAt)}</Table.Td>
                    <Table.Td>{entry.checkOutAt ? formatTimeOnly(entry.checkOutAt) : "-"}</Table.Td>
                    <Table.Td>
                      <Badge color={entryStatusColor(entry.status)} variant="light">
                        {entry.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {entry.shift ? formatShiftRange(entry.shift.startTime, entry.shift.endTime) : "-"}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>
    </Stack>
  );
}
