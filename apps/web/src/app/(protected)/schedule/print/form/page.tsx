"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlus, IconPrinter, IconRefresh, IconTrash } from "@tabler/icons-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageError, PageLoading } from "../../../../../components/page-states";
import { useEmployees } from "../../../../../hooks/use-employees";
import { useSchedulePrintForm } from "../../../../../hooks/use-print-form";
import type {
  EditablePrintFormHeader,
  PrintFormDayHeader,
  PrintFormResponse,
  PrintFormRow,
  PrintFormShiftSegment,
  PrintFormShiftTemplate,
} from "../../../../../lib/print-form";
import {
  buildEditableHeader,
  chunkRows,
  createManualPrintFormRow,
  padRows,
} from "../../../../../lib/print-form";
import { currentWeekStartIsoDate } from "../../../../../lib/time";

type EditableRow = PrintFormRow & { rowId: string };
type EditableTableLabels = {
  organizationLabel: string;
  orderLabel: string;
  personnelLabel: string;
  nameLabel: string;
  roleLabel: string;
  signatureLabel: string;
};

const DEFAULT_TABLE_LABELS: EditableTableLabels = {
  organizationLabel: "Organizasyon",
  orderLabel: "SIRA NO",
  personnelLabel: "PERSONELIN",
  nameLabel: "ADI SOYADI",
  roleLabel: "GOREVI",
  signatureLabel: "IMZA",
};

function createBlankRow(dayCount: number): EditableRow {
  return {
    rowId: `blank-${dayCount}-${Math.random().toString(36).slice(2, 8)}`,
    source: "manual",
    name: "",
    position: "",
    days: Array.from({ length: dayCount }, () => ""),
    signatureColumns: Array.from({ length: dayCount }, () => ""),
  };
}

function SchedulePrintFormPageContent() {
  const searchParams = useSearchParams();
  const initialWeekStart = searchParams.get("start") ?? currentWeekStartIsoDate();
  const initialDepartment = searchParams.get("department") ?? "all";

  const { data: employees, isLoading: employeesLoading, isError: employeesError } = useEmployees(true);
  const [selectionWeekStart, setSelectionWeekStart] = useState(initialWeekStart);
  const [selectionDepartment, setSelectionDepartment] = useState(initialDepartment);
  const [requestState, setRequestState] = useState({ weekStart: initialWeekStart, department: initialDepartment });
  const [editorHeader, setEditorHeader] = useState<EditablePrintFormHeader | null>(null);
  const [editorRows, setEditorRows] = useState<EditableRow[]>([]);
  const [editorDayHeaders, setEditorDayHeaders] = useState<PrintFormDayHeader[]>([]);
  const [editorShiftTemplates, setEditorShiftTemplates] = useState<PrintFormShiftTemplate[]>([]);
  const [editorTableLabels, setEditorTableLabels] = useState<EditableTableLabels>(DEFAULT_TABLE_LABELS);
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loadRequested, setLoadRequested] = useState(Boolean(initialWeekStart));
  const manualCounterRef = useRef(0);

  const departmentOptions = useMemo(() => {
    const uniqueDepartments = Array.from(
      new Set((employees ?? []).map((employee) => employee.department).filter(Boolean)),
    ) as string[];

    return [
      { value: "all", label: "Tum Departmanlar" },
      ...uniqueDepartments.map((department) => ({ value: department, label: department })),
    ];
  }, [employees]);

  const printFormQuery = useSchedulePrintForm(
    requestState.weekStart,
    requestState.department,
    loadRequested,
  );

  useEffect(() => {
    if (!printFormQuery.data) return;

    const data = printFormQuery.data as PrintFormResponse;
    manualCounterRef.current = 0;
    setEditorHeader(buildEditableHeader(data));
    setEditorRows(
      data.rows.map((row, index) => ({
        ...row,
        rowId: row.employeeId ? `employee-${row.employeeId}` : `row-${index}`,
      })),
    );
    setEditorDayHeaders(data.dayHeaders.map((dayHeader) => ({ ...dayHeader })));
    setEditorShiftTemplates(
      data.shiftTemplates.map((template) => ({
        ...template,
        segments: template.segments.map((segment) => ({ ...segment })),
      })),
    );
    setEditorTableLabels(DEFAULT_TABLE_LABELS);
    setAvailableCodes(data.availableCodes);
    setRowsPerPage(data.rowsPerPage);
    setSelectionDepartment(requestState.department);
    setSelectionWeekStart(requestState.weekStart);
  }, [printFormQuery.data, requestState.department, requestState.weekStart]);

  if (employeesLoading) {
    return <PageLoading />;
  }

  if (employeesError) {
    return <PageError message="Departman listesi yuklenemedi." />;
  }

  const handlePrepareForm = () => {
    setLoadRequested(true);
    setRequestState({
      weekStart: selectionWeekStart,
      department: selectionDepartment,
    });
  };

  const resetToSuggested = () => {
    if (!printFormQuery.data) return;
    const data = printFormQuery.data as PrintFormResponse;
    manualCounterRef.current = 0;
    setEditorHeader(buildEditableHeader(data));
    setEditorRows(
      data.rows.map((row, index) => ({
        ...row,
        rowId: row.employeeId ? `employee-${row.employeeId}` : `row-${index}`,
      })),
    );
    setEditorDayHeaders(data.dayHeaders.map((dayHeader) => ({ ...dayHeader })));
    setEditorShiftTemplates(
      data.shiftTemplates.map((template) => ({
        ...template,
        segments: template.segments.map((segment) => ({ ...segment })),
      })),
    );
    setEditorTableLabels(DEFAULT_TABLE_LABELS);
    setAvailableCodes(data.availableCodes);
    setRowsPerPage(data.rowsPerPage);
  };

  const addManualRow = () => {
    manualCounterRef.current += 1;
    setEditorRows((current) => [
      ...current,
      {
        ...createManualPrintFormRow(editorDayHeaders.length),
        rowId: `manual-${manualCounterRef.current}`,
      },
    ]);
  };

  const updateRowField = (rowId: string, field: "name" | "position", value: string) => {
    setEditorRows((current) =>
      current.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row)),
    );
  };

  const updateRowDayValue = (rowId: string, dayIndex: number, value: string) => {
    setEditorRows((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              days: row.days.map((dayValue, currentDayIndex) =>
                currentDayIndex === dayIndex ? value : dayValue,
              ),
            }
          : row,
      ),
    );
  };

  const updateSignatureValue = (rowId: string, dayIndex: number, value: string) => {
    setEditorRows((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              signatureColumns: row.signatureColumns.map((signatureValue, currentDayIndex) =>
                currentDayIndex === dayIndex ? value : signatureValue,
              ),
            }
          : row,
      ),
    );
  };

  const removeManualRow = (rowId: string) => {
    setEditorRows((current) => current.filter((row) => row.rowId !== rowId));
  };

  const updateDayHeader = (dayIndex: number, field: "dateLabel" | "dayLabel", value: string) => {
    setEditorDayHeaders((current) =>
      current.map((dayHeader, currentIndex) =>
        currentIndex === dayIndex ? { ...dayHeader, [field]: value } : dayHeader,
      ),
    );
  };

  const updateHeaderField = (field: keyof EditablePrintFormHeader, value: string) => {
    setEditorHeader((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateTableLabel = (field: keyof EditableTableLabels, value: string) => {
    setEditorTableLabels((current) => ({ ...current, [field]: value }));
  };

  const updateTemplateField = (
    templateIndex: number,
    field: "code" | "title" | "startTime" | "endTime" | "totalHoursLabel",
    value: string,
  ) => {
    setEditorShiftTemplates((current) =>
      current.map((template, currentIndex) =>
        currentIndex === templateIndex ? { ...template, [field]: value } : template,
      ),
    );
  };

  const updateTemplateSegment = (
    templateIndex: number,
    segmentIndex: number,
    field: keyof PrintFormShiftSegment,
    value: string,
  ) => {
    setEditorShiftTemplates((current) =>
      current.map((template, currentIndex) =>
        currentIndex === templateIndex
          ? {
              ...template,
              segments: template.segments.map((segment, currentSegmentIndex) =>
                currentSegmentIndex === segmentIndex ? { ...segment, [field]: value } : segment,
              ),
            }
          : template,
      ),
    );
  };

  const addTemplateSegment = (templateIndex: number) => {
    setEditorShiftTemplates((current) =>
      current.map((template, currentIndex) =>
        currentIndex === templateIndex
          ? {
              ...template,
              segments: [
                ...template.segments,
                { label: "", startTime: "", endTime: "", durationLabel: "" },
              ],
            }
          : template,
      ),
    );
  };

  const removeTemplateSegment = (templateIndex: number, segmentIndex: number) => {
    setEditorShiftTemplates((current) =>
      current.map((template, currentIndex) =>
        currentIndex === templateIndex
          ? {
              ...template,
              segments: template.segments.filter((_, currentSegmentIndex) => currentSegmentIndex !== segmentIndex),
            }
          : template,
      ),
    );
  };

  const pageRows = chunkRows(editorRows, rowsPerPage).map((rows) =>
    padRows(rows, rowsPerPage, () => createBlankRow(editorDayHeaders.length)),
  );

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { background: #fff; color: #000; }
          .no-print { display: none !important; }
          .print-form-shell { padding: 0 !important; }
          .print-page { box-shadow: none !important; border: none !important; margin: 0 0 8mm 0 !important; page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
          .print-input,
          .print-textarea {
            border-color: transparent !important;
            box-shadow: none !important;
            background: transparent !important;
          }
        }
        .print-form-shell {
          padding: 20px;
          max-width: 1600px;
          margin: 0 auto;
        }
        .print-page {
          background: #fff;
          border: 1px solid #d0d5dd;
          margin-top: 20px;
          padding: 18px;
        }
        .print-header-grid {
          display: grid;
          grid-template-columns: 180px 1fr 320px;
          gap: 16px;
          align-items: start;
          margin-bottom: 10px;
        }
        .brand-box {
          min-height: 72px;
          border: 1px solid #1f2937;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 10px;
          font-family: Georgia, "Times New Roman", serif;
        }
        .brand-box strong {
          font-size: 26px;
          line-height: 1;
        }
        .brand-box span {
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .header-title {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          letter-spacing: 0.04em;
        }
        .header-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 10px;
          align-items: center;
          font-size: 12px;
        }
        .header-meta label {
          font-weight: 700;
          text-align: right;
        }
        .print-input {
          width: 100%;
          border: 1px solid #cbd5e1;
          padding: 4px 6px;
          font: inherit;
          background: #fff;
        }
        .print-input.center {
          text-align: center;
        }
        .print-input.small {
          padding: 2px 4px;
          font-size: 11px;
        }
        .print-input.title-input {
          border: none;
          text-align: center;
          font-size: 24px;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 700;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 11px;
        }
        .print-table th,
        .print-table td {
          border: 1px solid #111827;
          padding: 2px;
          vertical-align: middle;
        }
        .print-table th {
          background: #f8fafc;
          text-align: center;
          font-weight: 700;
        }
        .print-table .narrow-col {
          width: 42px;
        }
        .print-table .name-col {
          width: 200px;
        }
        .print-table .role-col {
          width: 140px;
        }
        .print-table .day-col {
          width: 66px;
        }
        .print-table .signature-col {
          width: 58px;
        }
        .row-number {
          text-align: center;
          font-weight: 700;
        }
        .row-actions {
          display: flex;
          justify-content: center;
          gap: 4px;
        }
        .codes-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .template-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 10px;
        }
        .template-card {
          border: 1px solid #111827;
          padding: 6px;
          min-height: 160px;
        }
        .template-card .template-title {
          margin-bottom: 6px;
          font-weight: 700;
        }
        .template-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 4px;
          margin-bottom: 6px;
        }
        .segment-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr 1fr auto;
          gap: 4px;
          margin-bottom: 4px;
          align-items: center;
        }
        .template-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .print-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          font-size: 11px;
        }
      `}</style>

      <div className="print-form-shell">
        <Stack gap="md">
          <Group justify="space-between" align="center" wrap="wrap">
            <Stack gap={2}>
              <Group gap="xs">
                <Badge variant="light">GENIS YAZDIR</Badge>
                <Badge variant="light">Haftalik Calisma Formu</Badge>
              </Group>
              <Title order={2}>Duzenlenebilir Haftalik Calisma Formu</Title>
              <Text c="dimmed" size="sm">
                Standart yazdirmaya ek olarak, tabloyu hucre bazinda duzenleyip manuel satir ekleyebilirsiniz.
              </Text>
            </Stack>
            <Group className="no-print">
              <Button variant="default" onClick={() => window.history.back()}>
                Geri Don
              </Button>
              <Button leftSection={<IconPrinter size={16} />} onClick={() => window.print()} disabled={!editorHeader}>
                Yazdir
              </Button>
            </Group>
          </Group>

          <Card withBorder radius="md" p="md" className="no-print">
            <Stack gap="sm">
              <Title order={4}>Form Secimi</Title>
              <Group align="end" wrap="wrap">
                <TextInput
                  label="Hafta Baslangici"
                  type="date"
                  value={selectionWeekStart}
                  onChange={(event) => setSelectionWeekStart(event.currentTarget.value)}
                />
                <Select
                  label="Departman"
                  w={240}
                  data={departmentOptions}
                  value={selectionDepartment}
                  onChange={(value) => setSelectionDepartment(value ?? "all")}
                />
                <Button onClick={handlePrepareForm} loading={printFormQuery.isLoading}>
                  Formu Hazirla
                </Button>
                <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={resetToSuggested} disabled={!printFormQuery.data}>
                  Otomatik Degerlere Don
                </Button>
                <Button variant="light" leftSection={<IconPlus size={16} />} onClick={addManualRow} disabled={!editorHeader}>
                  Manuel Satir Ekle
                </Button>
              </Group>
              {printFormQuery.isError && (
                <Alert color="red" title="Form Yuklenemedi">
                  Form verisi alinirken bir hata olustu. Departman secimini ve oturum yetkilerini kontrol edin.
                </Alert>
              )}
              {availableCodes.length > 0 && (
                <Stack gap={4}>
                  <Text size="sm" fw={600}>Onerilen Kodlar</Text>
                  <div className="codes-bar">
                    {availableCodes.map((code) => (
                      <Badge key={code} variant="light" color="gray">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </Stack>
              )}
            </Stack>
          </Card>

          {printFormQuery.isLoading && !editorHeader && <PageLoading />}

          {editorHeader && pageRows.map((rows, pageIndex) => (
            <div className="print-page" key={`page-${pageIndex}`}>
              <div className="print-header-grid">
                <div className="brand-box">
                  <strong>V</strong>
                  <span>Vardiya</span>
                </div>

                <div className="header-title">
                  <input
                    className="print-input title-input"
                    value={editorHeader.formTitle}
                    onChange={(event) => updateHeaderField("formTitle", event.currentTarget.value)}
                  />
                </div>

                <div className="header-meta">
                  <input
                    className="print-input small"
                    value={editorHeader.departmentLabel}
                    onChange={(event) => updateHeaderField("departmentLabel", event.currentTarget.value)}
                  />
                  <input
                    className="print-input small"
                    value={editorHeader.departmentValue}
                    onChange={(event) => updateHeaderField("departmentValue", event.currentTarget.value)}
                  />
                  <input
                    className="print-input small"
                    value={editorHeader.dateFromLabel}
                    onChange={(event) => updateHeaderField("dateFromLabel", event.currentTarget.value)}
                  />
                  <input
                    className="print-input small"
                    value={editorHeader.dateFromValue}
                    onChange={(event) => updateHeaderField("dateFromValue", event.currentTarget.value)}
                  />
                  <input
                    className="print-input small"
                    value={editorHeader.dateToLabel}
                    onChange={(event) => updateHeaderField("dateToLabel", event.currentTarget.value)}
                  />
                  <input
                    className="print-input small"
                    value={editorHeader.dateToValue}
                    onChange={(event) => updateHeaderField("dateToValue", event.currentTarget.value)}
                  />
                </div>
              </div>

              <Group justify="space-between" align="center" mb="xs">
                <input
                  className="print-input"
                  style={{ maxWidth: 200, fontWeight: 700 }}
                  value={editorTableLabels.organizationLabel}
                  onChange={(event) => updateTableLabel("organizationLabel", event.currentTarget.value)}
                />
                <input
                  className="print-input"
                  style={{ maxWidth: 360 }}
                  value={editorHeader.organizationName}
                  onChange={(event) => updateHeaderField("organizationName", event.currentTarget.value)}
                />
              </Group>

              <table className="print-table">
                <thead>
                  <tr>
                    <th className="narrow-col" rowSpan={2}>
                      <input
                        className="print-input small center"
                        value={editorTableLabels.orderLabel}
                        onChange={(event) => updateTableLabel("orderLabel", event.currentTarget.value)}
                      />
                    </th>
                    <th className="name-col" colSpan={2}>
                      <input
                        className="print-input small center"
                        value={editorTableLabels.personnelLabel}
                        onChange={(event) => updateTableLabel("personnelLabel", event.currentTarget.value)}
                      />
                    </th>
                    {editorDayHeaders.map((dayHeader, dayIndex) => (
                      <th key={`date-${dayHeader.date}-${pageIndex}`} className="day-col">
                        <input
                          className="print-input small center"
                          value={dayHeader.dateLabel}
                          onChange={(event) => updateDayHeader(dayIndex, "dateLabel", event.currentTarget.value)}
                        />
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="name-col">
                      <input
                        className="print-input small center"
                        value={editorTableLabels.nameLabel}
                        onChange={(event) => updateTableLabel("nameLabel", event.currentTarget.value)}
                      />
                    </th>
                    <th className="role-col">
                      <input
                        className="print-input small center"
                        value={editorTableLabels.roleLabel}
                        onChange={(event) => updateTableLabel("roleLabel", event.currentTarget.value)}
                      />
                    </th>
                    {editorDayHeaders.map((dayHeader, dayIndex) => (
                      <th key={`day-${dayHeader.date}-${pageIndex}`}>
                        <div style={{ display: "grid", gridTemplateColumns: "66px 58px" }}>
                          <input
                            className="print-input small center"
                            value={dayHeader.dayLabel}
                            onChange={(event) => updateDayHeader(dayIndex, "dayLabel", event.currentTarget.value)}
                          />
                          <input
                            className="print-input small center"
                            style={{ borderLeft: "1px solid #111827" }}
                            value={editorTableLabels.signatureLabel}
                            onChange={(event) => updateTableLabel("signatureLabel", event.currentTarget.value)}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => {
                    const rowNumber = pageIndex * rowsPerPage + rowIndex + 1;
                    const isEditableRow = editorRows.some((editorRow) => editorRow.rowId === row.rowId);

                    return (
                      <tr key={`${row.rowId}-${pageIndex}-${rowIndex}`}>
                        <td className="row-number">
                          <div>{rowNumber}</div>
                          {row.source === "manual" && isEditableRow && (
                            <div className="row-actions no-print">
                              <ActionIcon
                                size="xs"
                                color="red"
                                variant="light"
                                onClick={() => removeManualRow(row.rowId)}
                                aria-label="Satiri sil"
                              >
                                <IconTrash size={12} />
                              </ActionIcon>
                            </div>
                          )}
                        </td>
                        <td>
                          <input
                            className="print-input small"
                            readOnly={!isEditableRow}
                            value={row.name}
                            onChange={(event) => updateRowField(row.rowId, "name", event.currentTarget.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="print-input small"
                            readOnly={!isEditableRow}
                            value={row.position}
                            onChange={(event) => updateRowField(row.rowId, "position", event.currentTarget.value)}
                          />
                        </td>
                        {editorDayHeaders.map((dayHeader, dayIndex) => (
                          <td key={`${row.rowId}-${dayHeader.date}`}>
                            <div style={{ display: "grid", gridTemplateColumns: "66px 58px" }}>
                              <input
                                className="print-input small center"
                                readOnly={!isEditableRow}
                                value={row.days[dayIndex] ?? ""}
                                onChange={(event) => updateRowDayValue(row.rowId, dayIndex, event.currentTarget.value)}
                              />
                              <input
                                className="print-input small center"
                                style={{ borderLeft: "1px solid #111827" }}
                                readOnly={!isEditableRow}
                                value={row.signatureColumns[dayIndex] ?? ""}
                                onChange={(event) => updateSignatureValue(row.rowId, dayIndex, event.currentTarget.value)}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="template-grid">
                {editorShiftTemplates.map((template, templateIndex) => (
                  <div key={`${template.code}-${templateIndex}`} className="template-card">
                    <div className="template-actions">
                      <Badge variant="light">{template.code || `Sablon ${templateIndex + 1}`}</Badge>
                      <Button
                        size="compact-xs"
                        variant="light"
                        className="no-print"
                        onClick={() => addTemplateSegment(templateIndex)}
                      >
                        Satir Ekle
                      </Button>
                    </div>
                    <div className="template-title">
                      <input
                        className="print-input small"
                        value={template.title}
                        onChange={(event) => updateTemplateField(templateIndex, "title", event.currentTarget.value)}
                      />
                    </div>
                    <div className="template-meta">
                      <input
                        className="print-input small center"
                        value={template.startTime}
                        onChange={(event) => updateTemplateField(templateIndex, "startTime", event.currentTarget.value)}
                        placeholder="Baslangic"
                      />
                      <input
                        className="print-input small center"
                        value={template.endTime}
                        onChange={(event) => updateTemplateField(templateIndex, "endTime", event.currentTarget.value)}
                        placeholder="Bitis"
                      />
                      <input
                        className="print-input small center"
                        value={template.totalHoursLabel}
                        onChange={(event) => updateTemplateField(templateIndex, "totalHoursLabel", event.currentTarget.value)}
                        placeholder="Toplam"
                      />
                    </div>
                    {template.segments.map((segment, segmentIndex) => (
                      <div key={`${template.code}-segment-${segmentIndex}`} className="segment-grid">
                        <input
                          className="print-input small"
                          value={segment.label}
                          onChange={(event) =>
                            updateTemplateSegment(templateIndex, segmentIndex, "label", event.currentTarget.value)
                          }
                          placeholder="Aciklama"
                        />
                        <input
                          className="print-input small center"
                          value={segment.startTime}
                          onChange={(event) =>
                            updateTemplateSegment(templateIndex, segmentIndex, "startTime", event.currentTarget.value)
                          }
                          placeholder="Baslangic"
                        />
                        <input
                          className="print-input small center"
                          value={segment.endTime}
                          onChange={(event) =>
                            updateTemplateSegment(templateIndex, segmentIndex, "endTime", event.currentTarget.value)
                          }
                          placeholder="Bitis"
                        />
                        <input
                          className="print-input small center"
                          value={segment.durationLabel}
                          onChange={(event) =>
                            updateTemplateSegment(templateIndex, segmentIndex, "durationLabel", event.currentTarget.value)
                          }
                          placeholder="Sure"
                        />
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="red"
                          className="no-print"
                          onClick={() => removeTemplateSegment(templateIndex, segmentIndex)}
                          aria-label="Segment sil"
                        >
                          <IconTrash size={12} />
                        </ActionIcon>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="print-footer">
                <span>Sayfa {pageIndex + 1}</span>
                <span>{editorRows.length} aktif satir</span>
              </div>
            </div>
          ))}
        </Stack>
      </div>
    </>
  );
}

export default function SchedulePrintFormPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SchedulePrintFormPageContent />
    </Suspense>
  );
}
