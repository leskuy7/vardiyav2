"use client";

import {
  Autocomplete,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { useMemo, useState } from 'react';
import { PageError, PageLoading } from '../../../components/page-states';
import { useEmployeeActions, useEmployees, type EmployeeItem } from '../../../hooks/use-employees';

type FormMode = 'create' | 'edit';

type EmployeeForm = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'MANAGER' | 'EMPLOYEE';
  position: string;
  department: string;
  phone: string;
  hourlyRate: number;
  maxWeeklyHours: number;
};

const initialForm: EmployeeForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'EMPLOYEE',
  position: '',
  department: '',
  phone: '',
  hourlyRate: 0,
  maxWeeklyHours: 45
};

function nameParts(name: string) {
  const parts = name.split(' ');
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ') || 'Çalışan'
  };
}

export default function EmployeesPage() {
  const { data, isLoading, isError } = useEmployees(true);
  const { createEmployee, updateEmployee, archiveEmployee } = useEmployeeActions();

  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [error, setError] = useState<string | null>(null);

  const departmentOptions = useMemo(() => {
    const departments = Array.from(new Set((data ?? []).map((employee) => employee.department).filter(Boolean))) as string[];
    return [{ value: 'all', label: 'Tüm Departmanlar' }, ...departments.map((department) => ({ value: department, label: department }))];
  }, [data]);

  const departmentFormOptions = useMemo(() => {
    const departments = Array.from(new Set((data ?? []).map((e) => e.department).filter(Boolean))) as string[];
    return departments.map((d) => ({ value: d, label: d }));
  }, [data]);

  const positionFormOptions = useMemo(() => {
    const positions = Array.from(new Set((data ?? []).map((e) => e.position).filter(Boolean))) as string[];
    return positions.map((p) => ({ value: p, label: p }));
  }, [data]);

  const rows = useMemo(() => {
    const all = data ?? [];
    const lower = query.toLowerCase();

    return all
      .filter((employee) => {
        if (departmentFilter !== 'all' && employee.department !== departmentFilter) {
          return false;
        }

        if (!query.trim()) {
          return true;
        }

        return [employee.user.name, employee.user.email, employee.position ?? '', employee.department ?? '']
          .join(' ')
          .toLowerCase()
          .includes(lower);
      })
      .sort((left, right) => left.user.name.localeCompare(right.user.name, 'tr'));
  }, [data, query, departmentFilter]);

  const total = data?.length ?? 0;
  const withDepartment = (data ?? []).filter((employee) => employee.department).length;
  const withPosition = (data ?? []).filter((employee) => employee.position).length;

  if (isLoading) return <PageLoading />;
  if (isError) return <PageError message="Çalışanlar yüklenemedi." />;

  function openCreateModal() {
    setFormMode('create');
    setEditingEmployee(null);
    setForm(initialForm);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(employee: EmployeeItem) {
    const { firstName, lastName } = nameParts(employee.user.name);
    setFormMode('edit');
    setEditingEmployee(employee);
    setForm({
      email: employee.user.email,
      password: '',
      firstName,
      lastName,
      role: (employee.user as any).role ?? 'EMPLOYEE',
      position: employee.position ?? '',
      department: employee.department ?? '',
      phone: employee.phone ?? '',
      hourlyRate: Number(employee.hourlyRate ?? 0),
      maxWeeklyHours: employee.maxWeeklyHours ?? 45
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      if (formMode === 'create') {
        if (!form.email || !form.password || !form.firstName) {
          setError('E-posta, şifre ve ad zorunlu alanlardır.');
          return;
        }
        await createEmployee.mutateAsync({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          position: form.position || undefined,
          department: form.department || undefined,
          phone: form.phone || undefined,
          hourlyRate: form.hourlyRate || undefined,
          maxWeeklyHours: form.maxWeeklyHours || undefined
        });
      } else if (editingEmployee) {
        await updateEmployee.mutateAsync({
          id: editingEmployee.id,
          position: form.position || undefined,
          department: form.department || undefined,
          phone: form.phone || undefined,
          hourlyRate: form.hourlyRate || undefined,
          maxWeeklyHours: form.maxWeeklyHours || undefined,
          isActive: true
        });
      }

      setModalOpen(false);
    } catch {
      setError('İşlem başarısız. Alanları kontrol edip tekrar dene.');
    }
  }

  async function handleArchive(employee: EmployeeItem) {
    const confirmed = window.confirm(
      `"${employee.user.name}" adlı çalışanı arşivlemek istediğine emin misin?\n\nBu işlem geri alınamaz.`
    );
    if (!confirmed) return;
    await archiveEmployee.mutateAsync(employee.id);
  }

  return (
    <Stack>
      <Group justify="space-between" align="center" wrap="wrap">
        <Stack gap={2}>
          <Group gap="xs">
            <Badge variant="light">ÇALIŞAN YÖNETİMİ</Badge>
          </Group>
          <Title order={2}>Çalışanlar</Title>
          <Text c="dimmed" size="sm">Kadro, departman, ücret ve saat limitlerini yönet.</Text>
        </Stack>
        <Group>
          <Badge size="lg" variant="light">Toplam: {total}</Badge>
          <Button onClick={openCreateModal}>Çalışan Ekle</Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Aktif Çalışan</Text>
            <Title order={3}>{total}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Departmanı Tanımlı</Text>
            <Title order={3}>{withDepartment}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Pozisyonu Tanımlı</Text>
            <Title order={3}>{withPosition}</Title>
          </Card>
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <TextInput
            label="Çalışan Ara"
            description="Ad, e-posta, pozisyon veya departman ile filtrele"
            placeholder="Ad, e-posta, pozisyon veya departman ara"
            radius="md"
            size="md"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Select
            label="Departman"
            data={departmentOptions}
            value={departmentFilter}
            onChange={(value) => setDepartmentFilter(value ?? 'all')}
          />
        </Grid.Col>
      </Grid>

      <ScrollArea>
        <Table withTableBorder striped="odd" highlightOnHover verticalSpacing="md" horizontalSpacing="sm" className="premium-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Ad</Table.Th>
              <Table.Th>E-posta</Table.Th>
              <Table.Th>Pozisyon</Table.Th>
              <Table.Th>Departman</Table.Th>
              <Table.Th>Saatlik Ücret</Table.Th>
              <Table.Th>Haftalık Limit</Table.Th>
              <Table.Th>Aksiyon</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text c="dimmed" ta="center">Sonuç bulunamadı.</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              rows.map((employee) => (
                <Table.Tr key={employee.id}>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text fw={600}>{employee.user.name}</Text>
                      <Text size="xs" c="dimmed">#{employee.id.slice(0, 8)}</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>{employee.user.email}</Table.Td>
                  <Table.Td>{employee.position ? <Badge variant="light">{employee.position}</Badge> : <Text c="dimmed">-</Text>}</Table.Td>
                  <Table.Td>{employee.department ? <Badge variant="light" color="grape">{employee.department}</Badge> : <Text c="dimmed">-</Text>}</Table.Td>
                  <Table.Td>{employee.hourlyRate ? `₺${Number(employee.hourlyRate).toFixed(2)}` : '-'}</Table.Td>
                  <Table.Td>{employee.maxWeeklyHours ?? 45} saat</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button size="xs" variant="light" onClick={() => openEditModal(employee)}>Düzenle</Button>
                      <Button size="xs" variant="light" color="red" onClick={() => handleArchive(employee)} loading={archiveEmployee.isPending}>
                        Arşivle
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={formMode === 'create' ? 'Çalışan Ekle' : 'Çalışanı Düzenle'}>
        <form onSubmit={handleSubmit}>
          <Stack>
            {formMode === 'create' ? (
              <>
                <TextInput label="E-posta" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.currentTarget.value }))} required />
                <TextInput label="Şifre" type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.currentTarget.value }))} required />
                <Group grow>
                  <TextInput label="Ad" value={form.firstName} onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.currentTarget.value }))} required />
                  <TextInput label="Soyad" value={form.lastName} onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.currentTarget.value }))} />
                </Group>
                <Select
                  label="Rol"
                  data={[
                    { value: 'EMPLOYEE', label: 'Çalışan' },
                    { value: 'MANAGER', label: 'Müdür' }
                  ]}
                  value={form.role}
                  onChange={(value) => setForm((prev) => ({ ...prev, role: (value as 'MANAGER' | 'EMPLOYEE') ?? 'EMPLOYEE' }))}
                />
              </>
            ) : (
              <>
                <TextInput label="Ad" value={form.firstName} disabled description="İsim düzenlemesi yakında eklenecek." />
                <TextInput label="Soyad" value={form.lastName} disabled />
                <TextInput label="E-posta" value={form.email} disabled />
                <Select
                  label="Rol"
                  data={[
                    { value: 'EMPLOYEE', label: 'Çalışan' },
                    { value: 'MANAGER', label: 'Müdür' }
                  ]}
                  value={form.role}
                  disabled
                  description="Rol değişikliği yakında eklenecek."
                />
              </>
            )}

            <Autocomplete
              label="Pozisyon"
              placeholder="Pozisyon seç veya yeni yaz"
              data={positionFormOptions.map((o) => o.value)}
              value={form.position}
              onChange={(value) => setForm((prev) => ({ ...prev, position: value }))}
            />
            <Autocomplete
              label="Departman"
              placeholder="Departman seç veya yeni yaz"
              data={departmentFormOptions.map((o) => o.value)}
              value={form.department}
              onChange={(value) => setForm((prev) => ({ ...prev, department: value }))}
            />
            <TextInput label="Telefon" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.currentTarget.value }))} />
            <NumberInput
              label="Saatlik Ücret"
              min={0}
              value={form.hourlyRate}
              onChange={(value) => setForm((prev) => ({ ...prev, hourlyRate: Number(value) || 0 }))}
            />
            <NumberInput
              label="Maksimum Haftalık Saat"
              min={1}
              value={form.maxWeeklyHours}
              onChange={(value) => setForm((prev) => ({ ...prev, maxWeeklyHours: Number(value) || 45 }))}
            />

            {error ? <Text c="red" size="sm">{error}</Text> : null}

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setModalOpen(false)} type="button">Vazgeç</Button>
              <Button type="submit" loading={createEmployee.isPending || updateEmployee.isPending}>Kaydet</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
