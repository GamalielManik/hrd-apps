'use client';

import { useEffect, useState, useCallback } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
    getWeeksInMonth, getWorkDays, toISODateString,
    DAY_NAMES_ID, format, getDay,
} from '@/lib/dateUtils';
import type { Employee, AttendanceLog, AttendanceStatus, PayrollWeek } from '@/types';
import { DIVISIONS_FALLBACK } from '@/types';

// ── Constants ──────────────────────────────────────────────────
const NORMAL_HOURS = 9; // Standard work hours per day (excluding 1hr break)
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// ── Types ──────────────────────────────────────────────────────
type CellData = {
    hours_worked: number;   // 0–9, decimal — 0 means absent
    overtime_hours: number; // 0+, decimal
    status: AttendanceStatus; // derived: >0=Hadir, 0=Alpha/Izin (manual)
};
type Grid = Record<string, Record<string, CellData>>;

const DEFAULT_CELL: CellData = { hours_worked: NORMAL_HOURS, overtime_hours: 0, status: 'Hadir' };

// ── Component ──────────────────────────────────────────────────
export default function AbsensiPage() {
    const today = new Date();

    // Step 1: Division
    const [divisions, setDivisions] = useState<string[]>(DIVISIONS_FALLBACK);
    const [selectedDiv, setSelectedDiv] = useState('');

    // Step 2: Month / Year
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());

    // Step 3: Week
    const [selectedWeek, setSelectedWeek] = useState<PayrollWeek | null>(null);
    const weeks = getWeeksInMonth(month, year);

    // Data
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [grid, setGrid] = useState<Grid>({});
    const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set()); // tracks "empId|dateStr"
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const workDays = selectedWeek ? getWorkDays(selectedWeek) : [];

    // ── Load divisions ──────────────────────────────────────────
    useEffect(() => {
        supabase.from('divisions').select('name').eq('is_active', true).order('name')
            .then(({ data }) => {
                if (data && data.length > 0) {
                    const names = data.map((d: { name: string }) => d.name);
                    setDivisions(names);
                    setSelectedDiv(names[0]);
                }
            });
    }, []);

    // ── Load employees when division changes ───────────────────
    useEffect(() => {
        if (!selectedDiv) return;
        setSelectedWeek(null);
        setDirtyKeys(new Set()); // clear dirty on division switch
        supabase.from('employees').select('*')
            .eq('is_active', true)
            .eq('division', selectedDiv)
            .eq('worker_type', 'Daily')
            .order('name')
            .then(({ data }) => setEmployees(data ?? []));
    }, [selectedDiv]);

    // ── Load attendance when week changes ──────────────────────
    const loadAttendance = useCallback(async () => {
        if (!selectedWeek || employees.length === 0) return;
        const startStr = toISODateString(selectedWeek.friday);
        const endStr = toISODateString(selectedWeek.thursday);

        const { data } = await supabase
            .from('attendance_logs')
            .select('*')
            .in('employee_id', employees.map(e => e.id))
            .gte('work_date', startStr)
            .lte('work_date', endStr);

        // Build blank grid with defaults (full day, no OT, Hadir)
        const newGrid: Grid = {};
        employees.forEach(emp => {
            newGrid[emp.id] = {};
            workDays.forEach(day => {
                newGrid[emp.id][toISODateString(day)] = { ...DEFAULT_CELL };
            });
        });

        // Overlay saved records
        (data as AttendanceLog[] ?? []).forEach(log => {
            if (!newGrid[log.employee_id]) return;
            newGrid[log.employee_id][log.work_date] = {
                hours_worked: log.hours_worked ?? NORMAL_HOURS,
                overtime_hours: log.overtime_hours,
                status: log.status,
            };
        });
        setGrid(newGrid);
        setDirtyKeys(new Set()); // reset dirty on fresh load
    }, [selectedWeek, employees]);

    useEffect(() => { loadAttendance(); }, [loadAttendance]);

    // ── Cell update logic ──────────────────────────────────────
    function updateCell(empId: string, dateStr: string, field: keyof CellData, value: number | string) {
        // Mark this cell as dirty (user explicitly changed it)
        const key = `${empId}|${dateStr}`;
        setDirtyKeys(prev => new Set(prev).add(key));

        setGrid(prev => {
            const cell: CellData = { ...(prev[empId]?.[dateStr] ?? { ...DEFAULT_CELL }) };

            if (field === 'hours_worked') {
                const hrs = value === '' ? 0 : Number(value);
                cell.hours_worked = Math.min(hrs, NORMAL_HOURS);
                if (hrs > 0 && cell.status !== 'Izin') cell.status = 'Hadir';
                if (hrs === 0 && cell.status === 'Hadir') cell.status = 'Alpha';
            } else if (field === 'overtime_hours') {
                cell.overtime_hours = value === '' ? 0 : Number(value);
            } else if (field === 'status') {
                cell.status = value as AttendanceStatus;
                if (value === 'Hadir' && cell.hours_worked === 0) cell.hours_worked = NORMAL_HOURS;
                if ((value === 'Alpha' || value === 'Izin')) cell.hours_worked = 0;
            }

            return { ...prev, [empId]: { ...prev[empId], [dateStr]: cell } };
        });
    }

    // ── Save — only dirty cells ────────────────────────────────
    async function saveChanges() {
        if (dirtyKeys.size === 0) return;
        setSaving(true);

        // Build rows only for dirty keys
        const rows = Array.from(dirtyKeys).flatMap(key => {
            const [empId, dateStr] = key.split('|');
            const cell = grid[empId]?.[dateStr];
            if (!cell) return [];
            return [{
                employee_id: empId,
                work_date: dateStr,
                status: cell.status,
                overtime_hours: cell.overtime_hours,
                hours_worked: cell.hours_worked,
            }];
        });

        const { error } = await supabase.from('attendance_logs').upsert(rows, {
            onConflict: 'employee_id,work_date',
        });
        setSaving(false);
        if (error) {
            alert('Gagal simpan: ' + error.message);
        } else {
            setDirtyKeys(new Set()); // clear dirty after successful save
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    }

    // ── Calculations ───────────────────────────────────────────
    function calcPayForEmp(emp: Employee): number {
        const cells = Object.values(grid[emp.id] ?? {});
        // v2.0 formula: SUM(hours_worked / NORMAL_HOURS * daily_rate) + SUM(ot_hours * ot_rate)
        const dailyPay = cells.reduce((s, c) => s + (c.hours_worked / NORMAL_HOURS) * emp.base_daily_rate, 0);
        const otPay = cells.reduce((s, c) => s + c.overtime_hours * emp.overtime_rate_per_hour, 0);
        return dailyPay + otPay;
    }
    function totalHours(empId: string) { return Object.values(grid[empId] ?? {}).reduce((s, c) => s + c.hours_worked, 0); }
    function totalOT(empId: string) { return Object.values(grid[empId] ?? {}).reduce((s, c) => s + c.overtime_hours, 0); }
    const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

    // ── Render ─────────────────────────────────────────────────
    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Absensi</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                        Karyawan <strong>Harian</strong> · Jam normal = <strong>{NORMAL_HOURS} jam</strong>/hari (di luar 1 jam istirahat)
                    </p>
                </div>
                {selectedWeek && employees.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {saved && <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>✓ Tersimpan</span>}
                        {dirtyKeys.size > 0 && !saved && (
                            <span style={{
                                fontSize: '0.78rem', color: 'var(--warning)',
                                background: 'rgba(251,191,36,0.12)', padding: '0.2rem 0.6rem',
                                borderRadius: 6, border: '1px solid rgba(251,191,36,0.3)'
                            }}>
                                ⚠ {dirtyKeys.size} sel belum disimpan
                            </span>
                        )}
                        <button
                            className="btn btn-primary"
                            onClick={saveChanges}
                            disabled={saving || dirtyKeys.size === 0}
                            style={{ opacity: dirtyKeys.size === 0 ? 0.45 : 1 }}
                        >
                            <Save size={16} />
                            {saving ? 'Menyimpan...' : dirtyKeys.size > 0 ? `Simpan (${dirtyKeys.size})` : 'Tersimpan'}
                        </button>
                    </div>
                )}
            </div>

            {/* ── STEP 1: Division tabs ─────────────────────────────── */}
            <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    1 · Pilih Divisi
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {divisions.map(div => (
                        <button key={div}
                            onClick={() => setSelectedDiv(div)}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem',
                                fontWeight: selectedDiv === div ? 700 : 400,
                                background: selectedDiv === div ? 'var(--accent)' : 'var(--bg-card)',
                                color: selectedDiv === div ? '#fff' : 'var(--text-secondary)',
                                border: `1px solid ${selectedDiv === div ? 'var(--accent)' : 'var(--border)'}`,
                                transition: 'all 0.15s',
                            }}>
                            {div}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── STEP 2: Month + Year selector ────────────────────── */}
            {selectedDiv && (
                <div className="card" style={{ marginBottom: '1rem', padding: '0.9rem 1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        2 · Pilih Bulan
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {MONTHS_ID.map((m, i) => (
                                <button key={i}
                                    onClick={() => { setMonth(i + 1); setSelectedWeek(null); }}
                                    style={{
                                        padding: '0.3rem 0.6rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem',
                                        fontWeight: month === i + 1 ? 700 : 400,
                                        background: month === i + 1 ? 'rgba(79,142,247,0.18)' : 'transparent',
                                        color: month === i + 1 ? 'var(--accent)' : 'var(--text-secondary)',
                                        border: `1px solid ${month === i + 1 ? 'var(--accent)' : 'transparent'}`,
                                    }}>
                                    {m}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginLeft: 'auto' }}>
                            <button className="btn btn-ghost" style={{ padding: '0.3rem 0.55rem' }}
                                onClick={() => { setYear(y => y - 1); setSelectedWeek(null); }}>‹</button>
                            <span style={{ fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{year}</span>
                            <button className="btn btn-ghost" style={{ padding: '0.3rem 0.55rem' }}
                                onClick={() => { setYear(y => y + 1); setSelectedWeek(null); }}>›</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 3: Week selector ─────────────────────────────── */}
            {selectedDiv && (
                <div className="card" style={{ marginBottom: '1.5rem', padding: '0.9rem 1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        3 · Pilih Minggu
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {weeks.map((w, i) => {
                            const isSelected = selectedWeek?.friday.getTime() === w.friday.getTime();
                            return (
                                <button key={i} onClick={() => setSelectedWeek(w)}
                                    style={{
                                        padding: '0.5rem 0.9rem', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                                        fontWeight: isSelected ? 700 : 400,
                                        background: isSelected ? 'var(--accent)' : 'var(--bg-base)',
                                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                                        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                        transition: 'all 0.15s',
                                        minWidth: 110,
                                    }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 600 }}>Minggu {i + 1}</div>
                                    <div style={{ fontSize: '0.68rem', opacity: 0.8, marginTop: 2 }}>{w.label}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── STEP 4: Attendance Grid ───────────────────────────── */}
            {selectedWeek && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', background: '#1e2235', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {selectedDiv} · {selectedWeek.label}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Kolom per-hari:</span> Jam kerja (maks {NORMAL_HOURS}) | Lembur (jam)
                        </span>
                    </div>

                    {/* Saturday notice */}
                    <div style={{ padding: '0.45rem 1.25rem', background: 'rgba(255,107,107,0.07)', borderBottom: '1px solid rgba(255,107,107,0.15)', fontSize: '0.75rem', color: 'var(--saturday)' }}>
                        🔴 Sabtu = LIBUR — tidak ditampilkan dalam grid
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="ippl-table" style={{ minWidth: 700 }}>
                            <thead>
                                <tr>
                                    <th style={{ minWidth: 150 }}>Nama Karyawan</th>
                                    {workDays.map(day => (
                                        <th key={toISODateString(day)} style={{ textAlign: 'center', minWidth: 110 }}>
                                            <div>{DAY_NAMES_ID[getDay(day)]}, {format(day, 'dd/MM')}</div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                jam kerja | lembur
                                            </div>
                                        </th>
                                    ))}
                                    <th style={{ textAlign: 'center', minWidth: 70 }}>∑ Jam</th>
                                    <th style={{ textAlign: 'center', minWidth: 60 }}>∑ OT</th>
                                    <th style={{ textAlign: 'right', minWidth: 140 }}>Est. Gaji</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.length === 0 ? (
                                    <tr>
                                        <td colSpan={workDays.length + 4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2.5rem' }}>
                                            Tidak ada karyawan Harian aktif di divisi <strong>{selectedDiv}</strong>
                                        </td>
                                    </tr>
                                ) : employees.map(emp => (
                                    <tr key={emp.id}>
                                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap', paddingRight: '1rem' }}>{emp.name}</td>

                                        {workDays.map(day => {
                                            const dateStr = toISODateString(day);
                                            const cell = grid[emp.id]?.[dateStr] ?? { ...DEFAULT_CELL };
                                            const isAbsent = cell.hours_worked === 0;
                                            const isPartial = cell.hours_worked > 0 && cell.hours_worked < NORMAL_HOURS;
                                            const hasOT = cell.overtime_hours > 0;

                                            return (
                                                <td key={dateStr} style={{ padding: '0.35rem 0.4rem', verticalAlign: 'top' }}>
                                                    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                                                        {/* Jam kerja input */}
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                type="number" min={0} max={NORMAL_HOURS} step={0.5}
                                                                className="ippl-input"
                                                                title={`Jam kerja ${emp.name} — ${format(day, 'EEEE dd/MM')}`}
                                                                style={{
                                                                    fontSize: '0.75rem', padding: '0.25rem 0.3rem',
                                                                    width: 50, textAlign: 'center',
                                                                    borderColor: isAbsent ? 'var(--danger)' : isPartial ? 'var(--warning)' : 'var(--border)',
                                                                    color: isAbsent ? 'var(--danger)' : isPartial ? 'var(--warning)' : 'var(--success)',
                                                                }}
                                                                value={cell.hours_worked}
                                                                onChange={e => updateCell(emp.id, dateStr, 'hours_worked', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* OT hours input */}
                                                        <input
                                                            type="number" min={0} max={12} step={0.5}
                                                            className="ippl-input"
                                                            title="Jam lembur"
                                                            style={{
                                                                fontSize: '0.75rem', padding: '0.25rem 0.3rem',
                                                                width: 44, textAlign: 'center',
                                                                borderColor: hasOT ? 'var(--accent)' : 'var(--border)',
                                                                color: hasOT ? 'var(--accent)' : 'var(--text-secondary)',
                                                            }}
                                                            value={cell.overtime_hours}
                                                            onChange={e => updateCell(emp.id, dateStr, 'overtime_hours', e.target.value)}
                                                        />
                                                    </div>

                                                    {/* Status tag (only shown when absent) */}
                                                    {isAbsent && (
                                                        <select
                                                            className="ippl-select"
                                                            title="Pilih keterangan tidak hadir"
                                                            style={{
                                                                fontSize: '0.68rem', padding: '0.12rem 0.25rem', marginTop: 3,
                                                                color: cell.status === 'Izin' ? 'var(--warning)' : 'var(--danger)',
                                                                width: '100%',
                                                            }}
                                                            value={cell.status}
                                                            onChange={e => updateCell(emp.id, dateStr, 'status', e.target.value)}
                                                        >
                                                            <option value="Alpha">Alpha</option>
                                                            <option value="Izin">Izin</option>
                                                        </select>
                                                    )}

                                                    {/* Partial indicator */}
                                                    {isPartial && (
                                                        <div style={{ fontSize: '0.62rem', color: 'var(--warning)', marginTop: 2 }}>
                                                            {((cell.hours_worked / NORMAL_HOURS) * 100).toFixed(0)}%
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        {/* Totals */}
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                            {totalHours(emp.id)}j
                                        </td>
                                        <td style={{ textAlign: 'center', color: totalOT(emp.id) > 0 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                                            {totalOT(emp.id) > 0 ? totalOT(emp.id) + 'j' : '—'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                                            {fmt(calcPayForEmp(emp))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                            {/* Footer legend */}
                            {employees.length > 0 && (
                                <tfoot>
                                    <tr>
                                        <td colSpan={workDays.length + 4} style={{ padding: '0.6rem 1rem', fontSize: '0.72rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}>
                                            💡 <span style={{ color: 'var(--success)' }}>●</span> Penuh ({NORMAL_HOURS}j) &nbsp;
                                            <span style={{ color: 'var(--warning)' }}>●</span> Partial &nbsp;
                                            <span style={{ color: 'var(--danger)' }}>●</span> Tidak hadir (0j) &nbsp;·&nbsp;
                                            Formula: <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0 4px', borderRadius: 3 }}>(jam/{NORMAL_HOURS}) × tarif_harian + lembur × tarif_OT</code>
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {/* Placeholder when no week selected */}
            {!selectedWeek && selectedDiv && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
                    Pilih <strong>bulan</strong> dan <strong>minggu</strong> di atas untuk membuka grid absensi
                </div>
            )}
        </div>
    );
}
