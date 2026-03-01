"use client";

import { Button, Group } from "@mantine/core";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { PageError, PageLoading } from "../../../../components/page-states";
import { useEmployees } from "../../../../hooks/use-employees";
import { useWeeklyOvertime } from "../../../../hooks/use-overtime";
import type { Shift, WeeklySchedule } from "../../../../hooks/use-shifts";
import { useWeeklySchedule } from "../../../../hooks/use-shifts";
import { currentWeekStartIsoDate, formatWeekRange } from "../../../../lib/time";

const DAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateShort(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}

function PrintPageContent() {
  const searchParams = useSearchParams();
  const weekStart = searchParams.get("start") ?? currentWeekStartIsoDate();

  const { data: schedule, isLoading: scheduleLoading, isError: scheduleError } = useWeeklySchedule(weekStart);
  const { data: employeesData, isLoading: employeesLoading, isError: employeesError } = useEmployees(true);
  const { data: overtimeData = [], isLoading: overtimeLoading, isError: overtimeError } = useWeeklyOvertime(weekStart, "PLANNED");

  const isLoading = scheduleLoading || employeesLoading || overtimeLoading;
  const isError = scheduleError || employeesError || overtimeError;

  useEffect(() => {
    if (!isLoading && schedule) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [isLoading, schedule]);

  if (isLoading) {
    return <PageLoading />;
  }

  if (isError || !schedule) {
    return <PageError message="Vardiya verisi yüklenemedi." />;
  }

  const data = schedule as WeeklySchedule;
  const employees = (employeesData ?? [])
    .map((e) => ({ id: e.id, name: e.user?.name ?? e.id.slice(0, 8) }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  const exportCsv = () => {
    if (!overtimeData.length) return;
    const headers = ["Çalışan", "Normal Saat", "Toplam Saat", "Fazla Mesai", "Tahmini Maliyet"];
    const rows = overtimeData.map((r) => [
      r.employee?.user?.name ?? r.employeeId.slice(0, 8),
      (r.regularMinutes / 60).toFixed(2),
      ((r.regularMinutes + r.overtimeMinutes) / 60).toFixed(2),
      (r.overtimeMinutes / 60).toFixed(2),
      (r.estimatedPay ?? 0).toFixed(2),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bordro_${weekStart}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = { hours: 0, overtime: 0, cost: 0 };
  overtimeData.forEach((row) => {
    totals.hours += (row.regularMinutes + row.overtimeMinutes) / 60;
    totals.overtime += row.overtimeMinutes / 60;
    totals.cost += row.estimatedPay ?? 0;
  });

  return (
    <>
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { color: #000; background: #fff; }
          .no-print { display: none !important; }
        }
        .print-page {
          font-family: 'Segoe UI', system-ui, sans-serif;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          color: #000;
          background: #fff;
        }
        .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px; }
        .print-header h1 { margin: 0 0 4px 0; font-size: 22px; color: #000; }
        .print-header p { margin: 0; font-size: 14px; color: #000; }
        .print-actions { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; }
        .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; display: flex; justify-content: space-around; }
        .summary-item { text-align: center; }
        .summary-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .summary-value { font-size: 18px; font-weight: 700; color: #0f172a; }
        .schedule-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .schedule-table th, .schedule-table td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; text-align: left; }
        .schedule-table thead th { background: #fff; color: #000; font-weight: 700; text-align: center; font-size: 12px; }
        .schedule-table thead th.employee-col { background: #fff; text-align: left; min-width: 120px; }
        .schedule-table td.employee-cell { font-weight: 700; background: #fff; white-space: nowrap; font-size: 12px; }
        .schedule-table tbody tr:nth-child(even) { background: #fff; }
        .shift-cell { text-align: center; min-width: 80px; }
        .shift-time { font-weight: 600; color: #000; font-size: 12px; }
        .shift-status { font-size: 9px; padding: 1px 5px; border-radius: 4px; display: inline-block; margin-top: 2px; }
        .status-ACKNOWLEDGED, .status-PUBLISHED, .status-DRAFT, .status-CANCELLED { background: #fff; color: #000; border: 1px solid #000; }
        .status-CANCELLED { text-decoration: line-through; }
        .empty-cell { color: #666; text-align: center; }
        .print-footer { margin-top: 16px; font-size: 11px; color: #000; display: flex; justify-content: space-between; }
        .summary-row td { background: #fff !important; font-weight: 600; text-align: center; font-size: 11px; }
      `}</style>

      <div className="print-page">
        <div className="print-header">
          <p>{formatWeekRange(weekStart)}</p>
        </div>

        <Group className="no-print" justify="center" gap="sm" mb="md">
          <Button variant="filled" color="indigo" onClick={() => window.print()}>
            Yazdır
          </Button>
          <Button variant="filled" color="teal" onClick={exportCsv}>
            Bordro CSV İndir
          </Button>
          <Button variant="light" onClick={() => window.history.back()}>
            Geri Dön
          </Button>
        </Group>

        <div className="summary-box">
          <div className="summary-item">
            <div className="summary-label">Toplam Çalışma</div>
            <div className="summary-value">{totals.hours.toFixed(1)} Saat</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Toplam Mesai</div>
            <div className="summary-value">{totals.overtime.toFixed(1)} Saat</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Tahmini Personel Maliyeti</div>
            <div className="summary-value">₺{totals.cost.toFixed(2)}</div>
          </div>
        </div>

        <table className="schedule-table">
          <thead>
            <tr>
              <th className="employee-col">Çalışan</th>
              {data.days.map((day, i) => (
                <th key={day.date}>
                  {DAY_NAMES[i]}
                  <br />
                  <span style={{ fontWeight: 400, fontSize: 10 }}>{formatDateShort(day.date)}</span>
                </th>
              ))}
              <th>Toplam</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              let totalHours = 0;
              return (
                <tr key={emp.id}>
                  <td className="employee-cell">{emp.name}</td>
                  {data.days.map((day) => {
                    const shifts = day.shifts.filter((s: Shift) => s.employeeId === emp.id);
                    if (shifts.length === 0) {
                      return (
                        <td key={day.date} className="shift-cell empty-cell">
                          —
                        </td>
                      );
                    }
                    return (
                      <td key={day.date} className="shift-cell">
                        {shifts.map((shift: Shift) => {
                          const hours =
                            (new Date(shift.end).getTime() - new Date(shift.start).getTime()) / 3600000;
                          totalHours += hours;
                          return (
                            <div key={shift.id}>
                              <span className="shift-time">
                                {formatTime(shift.start)}–{formatTime(shift.end)}
                              </span>
                              <br />
                              <span className={`shift-status status-${shift.status}`}>
                                {shift.status === "ACKNOWLEDGED"
                                  ? "Onaylı"
                                  : shift.status === "PUBLISHED"
                                    ? "Yayında"
                                    : shift.status === "DRAFT"
                                      ? "Taslak"
                                      : "İptal"}
                              </span>
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "center", fontWeight: 600 }}>{totalHours.toFixed(1)}s</td>
                </tr>
              );
            })}
            <tr className="summary-row">
              <td>Toplam</td>
              {data.days.map((day) => (
                <td key={day.date}>{day.shifts.length} vardiya</td>
              ))}
              <td>
                {employees.length > 0
                  ? data.days
                      .flatMap((d) => d.shifts)
                      .reduce(
                        (sum, s) =>
                          sum + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 3600000,
                        0,
                      )
                      .toFixed(1) + "s"
                  : "—"}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="print-footer">
          <span>
            Oluşturma:{" "}
            {new Date().toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span>
            {employees.length} çalışan · {data.days.flatMap((d) => d.shifts).length} vardiya
          </span>
        </div>
      </div>
    </>
  );
}

export default function SchedulePrintPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PrintPageContent />
    </Suspense>
  );
}
