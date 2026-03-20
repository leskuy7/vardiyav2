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

type PartialPrintFormConfig = Partial<{
  rowsPerPage: unknown;
  headerDefaults: Partial<Record<keyof PrintFormHeaderDefaults, unknown>>;
  leaveCodeMap: Record<string, unknown>;
  shiftTemplates: unknown[];
}>;

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

function normalizeTime(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : "";
}

function normalizeText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function normalizeSegment(value: unknown): PrintFormShiftSegment | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    label: normalizeText(record.label),
    startTime: normalizeTime(record.startTime),
    endTime: normalizeTime(record.endTime),
    durationLabel: normalizeText(record.durationLabel),
  };
}

function normalizeTemplate(value: unknown, fallbackCode?: string): PrintFormShiftTemplate | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const code = normalizeText(record.code, fallbackCode ?? "").toUpperCase();
  if (!code) return null;
  const segments = Array.isArray(record.segments)
    ? record.segments.map((segment) => normalizeSegment(segment)).filter(Boolean) as PrintFormShiftSegment[]
    : [];

  return {
    code,
    title: normalizeText(record.title, `SHIFT: ${code}`) || `SHIFT: ${code}`,
    startTime: normalizeTime(record.startTime),
    endTime: normalizeTime(record.endTime),
    totalHoursLabel: normalizeText(record.totalHoursLabel),
    isActive: Boolean(record.isActive),
    segments,
  };
}

export function normalizePrintFormConfig(value: unknown): PrintFormConfig {
  const input = (value && typeof value === "object" ? value : {}) as PartialPrintFormConfig;
  const headerDefaults = {
    formTitle: normalizeText(input.headerDefaults?.formTitle, DEFAULT_PRINT_FORM_CONFIG.headerDefaults.formTitle)
      || DEFAULT_PRINT_FORM_CONFIG.headerDefaults.formTitle,
    departmentLabel: normalizeText(
      input.headerDefaults?.departmentLabel,
      DEFAULT_PRINT_FORM_CONFIG.headerDefaults.departmentLabel,
    ) || DEFAULT_PRINT_FORM_CONFIG.headerDefaults.departmentLabel,
    dateFromLabel: normalizeText(
      input.headerDefaults?.dateFromLabel,
      DEFAULT_PRINT_FORM_CONFIG.headerDefaults.dateFromLabel,
    ) || DEFAULT_PRINT_FORM_CONFIG.headerDefaults.dateFromLabel,
    dateToLabel: normalizeText(
      input.headerDefaults?.dateToLabel,
      DEFAULT_PRINT_FORM_CONFIG.headerDefaults.dateToLabel,
    ) || DEFAULT_PRINT_FORM_CONFIG.headerDefaults.dateToLabel,
  };

  const leaveCodeMap = {
    ...DEFAULT_PRINT_FORM_CONFIG.leaveCodeMap,
    ...Object.fromEntries(
      Object.entries(input.leaveCodeMap ?? {}).map(([key, rawValue]) => [key, normalizeText(rawValue)]),
    ),
  };

  const starterTemplates = DEFAULT_PRINT_FORM_CONFIG.shiftTemplates.map((template) => ({ ...template, segments: [] }));
  const normalizedTemplates = Array.isArray(input.shiftTemplates)
    ? input.shiftTemplates
        .map((template, index) => normalizeTemplate(template, STARTER_CODES[index]))
        .filter(Boolean) as PrintFormShiftTemplate[]
    : [];

  const templateMap = new Map<string, PrintFormShiftTemplate>();
  for (const template of starterTemplates) {
    templateMap.set(template.code, template);
  }
  for (const template of normalizedTemplates) {
    templateMap.set(template.code, template);
  }

  const shiftTemplates = Array.from(templateMap.values()).sort((left, right) => left.code.localeCompare(right.code, "en"));
  const rowsPerPage = typeof input.rowsPerPage === "number" && Number.isFinite(input.rowsPerPage)
    ? Math.max(1, Math.min(50, Math.trunc(input.rowsPerPage)))
    : DEFAULT_PRINT_FORM_CONFIG.rowsPerPage;

  return {
    rowsPerPage,
    headerDefaults,
    leaveCodeMap,
    shiftTemplates,
  };
}

export function mergePrintFormConfig(
  currentValue: unknown,
  incomingValue: unknown,
): PrintFormConfig {
  const current = normalizePrintFormConfig(currentValue);
  const incoming = (incomingValue && typeof incomingValue === "object" ? incomingValue : {}) as PartialPrintFormConfig;

  return normalizePrintFormConfig({
    ...current,
    ...incoming,
    headerDefaults: {
      ...current.headerDefaults,
      ...(incoming.headerDefaults ?? {}),
    },
    leaveCodeMap: {
      ...current.leaveCodeMap,
      ...(incoming.leaveCodeMap ?? {}),
    },
    shiftTemplates: incoming.shiftTemplates ?? current.shiftTemplates,
  });
}
