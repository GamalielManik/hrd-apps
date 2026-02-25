'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
    getCurrentPayrollWeek, nextPayrollWeek, prevPayrollWeek,
    getAllWeekDays, toISODateString, DAY_NAMES_ID, isSaturday, format, getDay,
} from '@/lib/dateUtils';
import type { Employee, AttendanceLog, AttendanceStatus, PayrollWeek } from '@/types';
import { ATTENDANCE_STATUSES } from '@/types';

type CellData = { status: AttendanceStatus; overtime_hours: number };
type Grid = Record<string, Record<string, CellData>>;

const STATUS_COLOR: Record<AttendanceStatus, string> = {
    Hadir: 'var(--success)',
    Izin: 'var(--warning)',
    Alpha: 'var(--danger)',
};

export default function AbsensiPage() {
    const [week, setWeek] = useState<PayrollWeek>(getCurrentPayrollWeek);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [grid, setGrid] = useState<Grid>({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const days = getAllWeekDays(week);

    const loadEmployees = useCallback(async () => {
        const { data } = await supabase.from('employees').select('*').eq('is_active', true).eq('worker_type', 'Daily').order('division').order('name');
        setEmployees(data ?? []);
        return data ?? [];
    }, []);

    const loadAttendance = useCallback(async (emps: Employee[]) => {
        const { data } = await supabase
            .from('attendance_logs')
            .select('*')
            .in('employee_id', emps.map(e => e.id))
            .gte('work_date', toISODateString(week.friday))
            .lte('work_date', toISODateString(week.thursday));

        const newGrid: Grid = {};
        emps.forEach(emp => {
            newGrid[emp.id] = {};
            days.forEach(day => {
                if (!isSaturday(day)) {
                    newGrid[emp.id][toISODateString(day)] = { status: 'Hadir', overtime_hours: 0 };
                }
            });
        });

        (data as AttendanceLog[] ?? []).forEach(log => {
            if (!newGrid[log.employee_id]) return;
            newGrid[log.employee_id][log.work_date] = {
                status: log.status,
                overtime_hours: log.overtime_hours,
            };
        });

        setGrid(newGrid);
    }, [week, days]);

    useEffect(() => {
        loadEmployees().then(loadAttendance);
    }, [week]);

    function updateCell(empId: string, dateStr: string, field: keyof CellData, value: string | number) {
        setGrid(prev => ({
            ...prev,
            [empId]: {
                ...prev[empId],
                [dateStr]: {
                    ...prev[empId]?.[dateStr],
                    [field]: value,
                },
            },
        }));
    }

    async function saveAll() {
        setSaving(true);
        const rows = employees.flatMap(emp =>
            Object.entries(grid[emp.id] ?? {}).map(([work_date, cell]) => ({
                employee_id: emp.id,
                work_date,
                status: cell.status,
                overtime_hours: cell.overtime_hours,
            }))
        );

        const { error } = await supabase.from('attendance_logs').upsert(rows, {
            onConflict: 'employee_id,work_date',
        });
        setSaving(false);
        if (error) alert('Gagal simpan: ' + error.message);
        else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    }

    function calcDailyPay(emp: Employee): number {
        const cells = Object.values(grid[emp.id] ?? {});
        const present = cells.filter(c => c.status === 'Hadir').length;
        const totalOT = cells.reduce((s, c) => s + c.overtime_hours, 0);
        return (present * emp.base_daily_rate) + (totalOT * emp.overtime_rate_per_hour);
    }

    function calcDaysPresent(empId: string): number {
        return Object.values(grid[empId] ?? {}).filter(c => c.status === 'Hadir').length;
    }

    function calcTotalOT(empId: string): number {
        return Object.values(grid[empId] ?? {}).reduce((s, c) => s + c.overtime_hours, 0);
    }

    const groupedByDivision = employees.reduce<Record<string, Employee[]>>((acc, e) => {
        acc[e.division] = acc[e.division] ?? [];
        acc[e.division].push(e);
        return acc;
    }, {});

    const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Absensi</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                        Berlaku untuk karyawan <strong>Harian</strong> saja
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {saved && <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>✓ Tersimpan</span>}
                    <button className="btn btn-primary" onClick={saveAll} disabled={saving}>
                        <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Semua'}
                    </button>
                </div>
            </div>

            {/* Week selector */}
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', padding: '1rem' }}>
                <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={() => setWeek(prevPayrollWeek(week))}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>Periode: {week.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Siklus Jumat – Kamis</div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={() => setWeek(nextPayrollWeek(week))}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Saturday warning */}
            <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--saturday)' }}>
                🔴 Kolom SABTU otomatis dinonaktifkan (hari libur — sesuai aturan bisnis)
            </div>

            {/* Grid per division */}
            {Object.entries(groupedByDivision).map(([division, emps]) => (
                <div key={division} className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', background: '#1e2235', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {division}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="ippl-table" style={{ minWidth: 800 }}>
                            <thead>
                                <tr>
                                    <th style={{ minWidth: 150 }}>Nama</th>
                                    {days.map(day => {
                                        const isSat = isSaturday(day);
                                        return (
                                            <th key={toISODateString(day)} className={isSat ? 'col-saturday' : ''} style={{ textAlign: 'center', minWidth: 110 }}>
                                                <div>{DAY_NAMES_ID[getDay(day)]}</div>
                                                <div style={{ fontWeight: 400, fontSize: '0.7rem' }}>{format(day, 'dd/MM')}</div>
                                                {isSat && <div style={{ color: 'var(--saturday)', fontSize: '0.65rem' }}>LIBUR</div>}
                                            </th>
                                        );
                                    })}
                                    <th style={{ textAlign: 'center', minWidth: 60 }}>Hadir</th>
                                    <th style={{ textAlign: 'center', minWidth: 60 }}>Lembur</th>
                                    <th style={{ textAlign: 'right', minWidth: 130 }}>Total Gaji</th>
                                </tr>
                            </thead>
                            <tbody>
                                {emps.map(emp => (
                                    <tr key={emp.id}>
                                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{emp.name}</td>
                                        {days.map(day => {
                                            const dateStr = toISODateString(day);
                                            const isSat = isSaturday(day);
                                            const cell = grid[emp.id]?.[dateStr];
                                            if (isSat) return <td key={dateStr} className="col-saturday" />;
                                            return (
                                                <td key={dateStr} style={{ padding: '0.4rem 0.5rem' }}>
                                                    <select
                                                        className="ippl-select"
                                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.35rem', color: cell?.status ? STATUS_COLOR[cell.status] : 'inherit', marginBottom: 4 }}
                                                        value={cell?.status ?? 'Hadir'}
                                                        onChange={e => updateCell(emp.id, dateStr, 'status', e.target.value as AttendanceStatus)}
                                                    >
                                                        {ATTENDANCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={12}
                                                        step={0.5}
                                                        className="ippl-input"
                                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.35rem' }}
                                                        placeholder="OT jam"
                                                        value={cell?.overtime_hours ?? 0}
                                                        onChange={e => updateCell(emp.id, dateStr, 'overtime_hours', Number(e.target.value))}
                                                    />
                                                </td>
                                            );
                                        })}
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>{calcDaysPresent(emp.id)}</td>
                                        <td style={{ textAlign: 'center', color: 'var(--warning)' }}>{calcTotalOT(emp.id)}j</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{fmt(calcDailyPay(emp))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            {employees.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    Belum ada karyawan harian aktif. Tambah dulu di menu <strong>Karyawan</strong>.
                </div>
            )}
        </div>
    );
}
