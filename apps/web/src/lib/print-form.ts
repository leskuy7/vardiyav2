export type PrintFormShiftSegment = {
  label: string;
  startTime: string;
  endTime: string;
  durationLabel: string;
};

export type PrintFormShiftTemplate = {
  code: string;
  title: string;
  startTime: string;
  endTime: string;
  totalHoursLabel: string;
  isActive: boolean;
  segments: PrintFormShiftSegment[];
};

export type PrintFormHeaderDefaults = {
  formTitle: string;
  departmentLabel: string;
  dateFromLabel: string;
  dateToLabel: string;
};

export type PrintFormConfig = {
  rowsPerPage: number;
  headerDefaults: PrintFormHeaderDefaults;
  leaveCodeMap: Record<string, string>;
  shiftTemplates: PrintFormShiftTemplate[];
};

export type PrintFormDayHeader = {
  date: string;
  dateLabel: string;
  dayLabel: string;
};

export type PrintFormRow = {
  source: "employee" | "manual";
  employeeId?: string;
  name: string;
  position: string;
  days: string[];
  signatureColumns: string[];
};

export type PrintFormResponse = {
  organizationName: string;
  selectedDepartment: string;
  weekStart: string;
  weekEnd: string;
  rowsPerPage: number;
  headerDefaults: PrintFormHeaderDefaults;
  leaveCodeMap: Record<string, string>;
  shiftTemplates: PrintFormShiftTemplate[];
  availableCodes: string[];
  availableDepartments: string[];
  dayHeaders: PrintFormDayHeader[];
  rows: PrintFormRow[];
};

export type EditablePrintFormHeader = {
  formTitle: string;
  organizationName: string;
  departmentLabel: string;
  departmentValue: string;
  dateFromLabel: string;
  dateFromValue: string;
  dateToLabel: string;
  dateToValue: string;
};

const STARTER_CODES = ["A", "B", "C", "D", "E", "F", "G"];

function createStarterTemplate(code: string): PrintFormShiftTemplate {
  return {
    code,
    title: `SHIFT: ${code}`,
    startTime: "",
    endTime: "",
    totalHoursLabel: "",
    isActive: false,
    segments: [],
  };
}

export const DEFAULT_PRINT_FORM_CONFIG: PrintFormConfig = {
  rowsPerPage: 20,
  headerDefaults: {
    formTitle: "HAFTALIK CALISMA FORMU",
    departmentLabel: "DEPARTMAN",
    dateFromLabel: "TARIHINDEN",
    dateToLabel: "TARIHINE KADAR",
  },
  leaveCodeMap: {
    ANNUAL: "YI",
    SICK: "R",
    UNPAID: "IZ",
    OTHER: "D",
    OFF: "OFF",
  },
  shiftTemplates: STARTER_CODES.map(createStarterTemplate),
};

export function createManualPrintFormRow(dayCount: number): PrintFormRow {
  return {
    source: "manual",
    name: "",
    position: "",
    days: Array.from({ length: dayCount }, () => ""),
    signatureColumns: Array.from({ length: dayCount }, () => ""),
  };
}

export function buildEditableHeader(data: PrintFormResponse): EditablePrintFormHeader {
  return {
    formTitle: data.headerDefaults.formTitle,
    organizationName: data.organizationName,
    departmentLabel: data.headerDefaults.departmentLabel,
    departmentValue: data.selectedDepartment,
    dateFromLabel: data.headerDefaults.dateFromLabel,
    dateFromValue: data.weekStart,
    dateToLabel: data.headerDefaults.dateToLabel,
    dateToValue: data.weekEnd,
  };
}

export function chunkRows<T>(rows: T[], pageSize: number) {
  if (rows.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += pageSize) {
    chunks.push(rows.slice(index, index + pageSize));
  }
  return chunks;
}

export function padRows<T>(rows: T[], pageSize: number, factory: () => T) {
  if (rows.length >= pageSize) return rows;
  return [...rows, ...Array.from({ length: pageSize - rows.length }, factory)];
}
