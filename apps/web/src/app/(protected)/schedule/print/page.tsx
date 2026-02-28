"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { currentWeekStartIsoDate } from '../../../../lib/time';

type Shift = {
    id: string;
    employeeId: string;
    employeeName?: string;
    start: string;
    end: string;
    status: string;
};

type WeeklySchedule = {
    start: string;
    end: string;
    days: Array<{ date: string; shifts: Shift[] }>;
};

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDateShort(iso: string) {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function formatWeekRange(isoDate: string) {
    const start = new Date(`${isoDate}T00:00:00Z`);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    const s = start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    const e = end.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${s} – ${e}`;
}

function PrintPageContent() {
    const searchParams = useSearchParams();
    const weekStart = searchParams.get('start') ?? currentWeekStartIsoDate();
    const [data, setData] = useState<WeeklySchedule | null>(null);
    const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get<WeeklySchedule>(`/schedule/week?start=${weekStart}`),
            api.get<any[]>('/employees?active=true')
        ])
            .then(([scheduleRes, empRes]) => {
                setData(scheduleRes.data);
                const employeeList = empRes.data.map((e) => ({
                    id: e.id,
                    name: e.user?.name ?? e.id.slice(0, 8)
                })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
                setEmployees(employeeList);
            })
            .catch(() => {
                setData(null);
            })
            .finally(() => setLoading(false));
    }, [weekStart]);

    // Auto-print
    useEffect(() => {
        if (!loading && data) {
            setTimeout(() => window.print(), 600);
        }
    }, [loading, data]);

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
                <p>Yükleniyor...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
                <p>Vardiya verisi yüklenemedi.</p>
            </div>
        );
    }

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

        .print-header {
          text-align: center;
          margin-bottom: 20px;
                    border-bottom: 2px solid #000;
          padding-bottom: 12px;
        }
        .print-header h1 {
          margin: 0 0 4px 0;
          font-size: 22px;
                    color: #000;
        }
        .print-header p {
          margin: 0;
          font-size: 14px;
                    color: #000;
        }

        .print-actions {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 16px;
        }
        .print-actions button {
          padding: 8px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        .btn-print {
          background: #4338ca;
          color: #fff;
        }
        .btn-back {
          background: #e5e7eb;
          color: #374151;
        }

        .schedule-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .schedule-table th,
        .schedule-table td {
          border: 1px solid #d1d5db;
          padding: 6px 8px;
          vertical-align: top;
          text-align: left;
        }
        .schedule-table thead th {
                    background: #fff;
                    color: #000;
          font-weight: 700;
          text-align: center;
          font-size: 12px;
        }
        .schedule-table thead th.employee-col {
                    background: #fff;
          text-align: left;
          min-width: 120px;
        }
        .schedule-table td.employee-cell {
          font-weight: 700;
                    background: #fff;
          white-space: nowrap;
          font-size: 12px;
        }
        .schedule-table tbody tr:nth-child(even) {
                    background: #fff;
        }
        .shift-cell {
          text-align: center;
          min-width: 80px;
        }
        .shift-time {
          font-weight: 600;
                    color: #000;
          font-size: 12px;
        }
        .shift-status {
          font-size: 9px;
          padding: 1px 5px;
          border-radius: 4px;
          display: inline-block;
          margin-top: 2px;
        }
                .status-ACKNOWLEDGED,
                .status-PUBLISHED,
                .status-DRAFT,
                .status-CANCELLED {
                    background: #fff;
                    color: #000;
                    border: 1px solid #000;
                }
                .status-CANCELLED { text-decoration: line-through; }
                .empty-cell { color: #666; text-align: center; }

        .print-footer {
          margin-top: 16px;
          font-size: 11px;
                    color: #000;
          display: flex;
          justify-content: space-between;
        }

        .summary-row td {
                    background: #fff !important;
          font-weight: 600;
          text-align: center;
          font-size: 11px;
        }
      `}</style>

            <div className="print-page">
                <div className="print-header">
                    <p>{formatWeekRange(weekStart)}</p>
                </div>

                <div className="print-actions no-print">
                    <button className="btn-print" onClick={() => window.print()}>🖨️ Yazdır</button>
                    <button className="btn-back" onClick={() => window.history.back()}>← Geri Dön</button>
                </div>

                <table className="schedule-table">
                    <thead>
                        <tr>
                            <th className="employee-col">Çalışan</th>
                            {data.days.map((day, i) => (
                                <th key={day.date}>
                                    {DAY_NAMES[i]}<br />
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
                                        const shifts = day.shifts.filter((s) => s.employeeId === emp.id);
                                        if (shifts.length === 0) {
                                            return <td key={day.date} className="shift-cell empty-cell">—</td>;
                                        }
                                        return (
                                            <td key={day.date} className="shift-cell">
                                                {shifts.map((shift) => {
                                                    const hours = (new Date(shift.end).getTime() - new Date(shift.start).getTime()) / 3600000;
                                                    totalHours += hours;
                                                    return (
                                                        <div key={shift.id}>
                                                            <span className="shift-time">{formatTime(shift.start)}–{formatTime(shift.end)}</span>
                                                            <br />
                                                            <span className={`shift-status status-${shift.status}`}>
                                                                {shift.status === 'ACKNOWLEDGED' ? 'Onaylı' : shift.status === 'PUBLISHED' ? 'Yayında' : shift.status === 'DRAFT' ? 'Taslak' : 'İptal'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </td>
                                        );
                                    })}
                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{totalHours.toFixed(1)}s</td>
                                </tr>
                            );
                        })}
                        {/* Summary row */}
                        <tr className="summary-row">
                            <td>Toplam</td>
                            {data.days.map((day) => (
                                <td key={day.date}>{day.shifts.length} vardiya</td>
                            ))}
                            <td>
                                {employees.length > 0
                                    ? data.days.flatMap((d) => d.shifts).reduce((sum, s) => sum + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 3600000, 0).toFixed(1) + 's'
                                    : '—'}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div className="print-footer">
                    <span>Oluşturma: {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{employees.length} çalışan · {data.days.flatMap((d) => d.shifts).length} vardiya</span>
                </div>
            </div>
        </>
    );
}

export default function SchedulePrintPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Yükleniyor...</div>}>
            <PrintPageContent />
        </Suspense>
    );
}
