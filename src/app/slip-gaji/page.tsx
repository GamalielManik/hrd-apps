'use client';

import { useEffect, useState, useCallback } from 'react';
import { Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getWeeksInMonth, getWorkDays, toISODateString } from '@/lib/dateUtils';
import type { Employee, AttendanceLog, PayrollWeek } from '@/types';
import { DIVISIONS_FALLBACK } from '@/types';
import SlipGajiDivisi from '@/components/SlipGajiDivisi';

// ── Constants ──────────────────────────────────────────────────
const NORMAL_HOURS = 9;
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// ── Types ──────────────────────────────────────────────────────
export interface EmployeeSlipRow {
    no: number;
    nama: string;
    hari_kerja: number;       // full days (hours_worked = 9)
    tarif_kerja: number;      // base_daily_rate
    total_kerja: number;      // hari_kerja × tarif_kerja
    lembur: number;           // total overtime hours
    tarif_lembur: number;     // overtime_rate_per_hour
    upah_lembur: number;      // lembur × tarif_lembur
    setengah_hari_jam: number;// sum of partial-day hours (0 < hw < 9)
    upah_setengah_hari: number;// (partial_hours / 9) × tarif_kerja
    total_upah: number;       // total_kerja + upah_lembur + upah_setengah_hari
}

export default function SlipGajiPage() {
    const today = new Date();

    // Navigation state
    const [divisions, setDivisions] = useState<string[]>(DIVISIONS_FALLBACK);
    const [selectedDiv, setSelectedDiv] = useState('');
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());
    const [selectedWeek, setSelectedWeek] = useState<PayrollWeek | null>(null);
    const weeks = getWeeksInMonth(month, year);

    // Data
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [slipRows, setSlipRows] = useState<EmployeeSlipRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [printMode, setPrintMode] = useState(false);

    // ── Load divisions ─────────────────────────────────────────
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

    // ── Load employees when division changes ──────────────────
    useEffect(() => {
        if (!selectedDiv) return;
        setSelectedWeek(null);
        setSlipRows([]);
        supabase.from('employees').select('*')
            .eq('is_active', true)
            .eq('division', selectedDiv)
            .order('name')
            .then(({ data }) => setEmployees(data ?? []));
    }, [selectedDiv]);

    // ── Calculate payroll when week selected ──────────────────
    const calculate = useCallback(async () => {
        if (!selectedWeek || employees.length === 0) return;
        setLoading(true);

        const startStr = toISODateString(selectedWeek.friday);
        const endStr = toISODateString(selectedWeek.thursday);
        const workDays = getWorkDays(selectedWeek);

        const [{ data: att }, { data: prod }] = await Promise.all([
            supabase.from('attendance_logs').select('*')
                .in('employee_id', employees.map(e => e.id))
                .gte('work_date', startStr).lte('work_date', endStr),
            supabase.from('production_logs').select('*')
                .in('employee_id', employees.map(e => e.id))
                .gte('work_date', startStr).lte('work_date', endStr),
        ]);

        const rows: EmployeeSlipRow[] = employees.map((emp, idx) => {
            const myAtt = (att ?? []).filter((a: { employee_id: string }) => a.employee_id === emp.id) as AttendanceLog[];
            const myProd = (prod ?? []).filter((p: { employee_id: string }) => p.employee_id === emp.id);

            // Separate full days vs partial days vs OT
            let hari_kerja = 0;
            let setengah_hari_jam = 0;
            let lembur = 0;

            workDays.forEach(day => {
                const dateStr = toISODateString(day);
                const log = myAtt.find(a => a.work_date === dateStr);
                const hw = log?.hours_worked ?? 0;
                const ot = log?.overtime_hours ?? 0;
                if (hw >= NORMAL_HOURS) hari_kerja += 1;
                else if (hw > 0) setengah_hari_jam += hw;
                lembur += ot;
            });

            // For Piece-rate workers, count from production logs too
            const borongan_pay = myProd.reduce((s: number, p: { quantity: number; rate_snapshot: number }) =>
                s + p.quantity * p.rate_snapshot, 0);

            const tarif_kerja = emp.base_daily_rate;
            const tarif_lembur = emp.overtime_rate_per_hour;
            const total_kerja = hari_kerja * tarif_kerja;
            const upah_lembur = lembur * tarif_lembur;
            const upah_setengah_hari = (setengah_hari_jam / NORMAL_HOURS) * tarif_kerja;
            const total_upah = total_kerja + upah_lembur + upah_setengah_hari + borongan_pay;

            return {
                no: idx + 1,
                nama: emp.name,
                hari_kerja,
                tarif_kerja,
                total_kerja,
                lembur,
                tarif_lembur,
                upah_lembur,
                setengah_hari_jam,
                upah_setengah_hari,
                total_upah,
            };
        }).filter(r => r.total_upah > 0 || r.hari_kerja > 0);

        setSlipRows(rows);
        setLoading(false);
    }, [selectedWeek, employees]);

    useEffect(() => { calculate(); }, [calculate]);

    const fmt = (n: number) => n > 0 ? n.toLocaleString('id-ID') : '0';

    if (printMode && selectedWeek) {
        return (
            <SlipGajiDivisi
                division={selectedDiv}
                week={selectedWeek}
                rows={slipRows}
                onBack={() => setPrintMode(false)}
            />
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Slip Gaji</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                        Rekap penggajian per divisi · Pilih divisi, bulan, dan minggu
                    </p>
                </div>
                {selectedWeek && slipRows.length > 0 && (
                    <button className="btn btn-primary" onClick={() => setPrintMode(true)}>
                        <Printer size={16} /> Cetak Rekap {selectedDiv}
                    </button>
                )}
            </div>

            {/* ── STEP 1: Division Tabs ─────────────────────────── */}
            <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    1 · Pilih Divisi
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {divisions.map(div => (
                        <button key={div} onClick={() => setSelectedDiv(div)}
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

            {/* ── STEP 2: Month / Year ─────────────────────────────── */}
            {selectedDiv && (
                <div className="card" style={{ marginBottom: '1rem', padding: '0.9rem 1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        2 · Pilih Bulan
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {MONTHS_ID.map((m, i) => (
                                <button key={i} onClick={() => { setMonth(i + 1); setSelectedWeek(null); }}
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

            {/* ── STEP 3: Week Selector ────────────────────────────── */}
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
                                        transition: 'all 0.15s', minWidth: 110,
                                    }}>
                                    <div style={{ fontSize: '0.85rem' }}>Minggu {i + 1}</div>
                                    <div style={{ fontSize: '0.68rem', opacity: 0.8, marginTop: 2 }}>{w.label}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Payroll Table ─────────────────────────────────────── */}
            {selectedWeek && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', background: '#1e2235', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {selectedDiv} · {selectedWeek.label}
                        </span>
                        {!loading && slipRows.length > 0 && (
                            <span style={{ color: 'var(--success)', fontSize: '0.78rem' }}>
                                {slipRows.length} karyawan · Grand Total: Rp {slipRows.reduce((s, r) => s + r.total_upah, 0).toLocaleString('id-ID')}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Menghitung...</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ippl-table" style={{ minWidth: 900 }}>
                                <thead>
                                    <tr style={{ fontSize: '0.75rem' }}>
                                        <th style={{ width: 40 }}>No</th>
                                        <th style={{ minWidth: 140 }}>NAMA</th>
                                        <th style={{ textAlign: 'center' }}>HARI<br />KERJA</th>
                                        <th style={{ textAlign: 'right' }}>TARIF<br />KERJA</th>
                                        <th style={{ textAlign: 'right' }}>TOTAL</th>
                                        <th style={{ textAlign: 'center' }}>LEMBUR<br />(jam)</th>
                                        <th style={{ textAlign: 'right' }}>TARIF<br />LEMBUR</th>
                                        <th style={{ textAlign: 'right' }}>UPAH<br />LEMBUR</th>
                                        <th style={{ textAlign: 'center' }}>½ HARI<br />(jam)</th>
                                        <th style={{ textAlign: 'right' }}>UPAH<br />½ HARI</th>
                                        <th style={{ textAlign: 'right', color: 'var(--accent)' }}>TOTAL<br />UPAH</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {slipRows.length === 0 ? (
                                        <tr><td colSpan={11} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                                            Belum ada data absensi untuk periode ini
                                        </td></tr>
                                    ) : slipRows.map(r => (
                                        <tr key={r.no} style={{ fontSize: '0.82rem' }}>
                                            <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{r.no}</td>
                                            <td style={{ fontWeight: 600 }}>{r.nama}</td>
                                            <td style={{ textAlign: 'center' }}>{r.hari_kerja || '—'}</td>
                                            <td style={{ textAlign: 'right' }}>{fmt(r.tarif_kerja)}</td>
                                            <td style={{ textAlign: 'right' }}>{fmt(r.total_kerja)}</td>
                                            <td style={{ textAlign: 'center', color: r.lembur > 0 ? 'var(--accent)' : 'var(--text-secondary)' }}>{r.lembur > 0 ? r.lembur : '—'}</td>
                                            <td style={{ textAlign: 'right' }}>{r.lembur > 0 ? fmt(r.tarif_lembur) : '—'}</td>
                                            <td style={{ textAlign: 'right', color: r.upah_lembur > 0 ? 'var(--accent)' : 'inherit' }}>{r.upah_lembur > 0 ? fmt(r.upah_lembur) : '—'}</td>
                                            <td style={{ textAlign: 'center', color: r.setengah_hari_jam > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>{r.setengah_hari_jam > 0 ? r.setengah_hari_jam : '—'}</td>
                                            <td style={{ textAlign: 'right', color: r.upah_setengah_hari > 0 ? 'var(--warning)' : 'inherit' }}>{r.upah_setengah_hari > 0 ? fmt(r.upah_setengah_hari) : '—'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>Rp {fmt(r.total_upah)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {slipRows.length > 0 && (
                                    <tfoot>
                                        <tr style={{ fontWeight: 700, fontSize: '0.82rem', borderTop: '2px solid var(--border)' }}>
                                            <td colSpan={2} style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>TOTAL</td>
                                            <td style={{ textAlign: 'center' }}>{slipRows.reduce((s, r) => s + r.hari_kerja, 0)}</td>
                                            <td />
                                            <td style={{ textAlign: 'right' }}>{slipRows.reduce((s, r) => s + r.total_kerja, 0).toLocaleString('id-ID')}</td>
                                            <td />
                                            <td />
                                            <td style={{ textAlign: 'right' }}>{slipRows.reduce((s, r) => s + r.upah_lembur, 0).toLocaleString('id-ID')}</td>
                                            <td style={{ textAlign: 'center' }}>{slipRows.reduce((s, r) => s + r.setengah_hari_jam, 0) || '—'}</td>
                                            <td style={{ textAlign: 'right' }}>{slipRows.reduce((s, r) => s + r.upah_setengah_hari, 0).toLocaleString('id-ID')}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--accent)' }}>Rp {slipRows.reduce((s, r) => s + r.total_upah, 0).toLocaleString('id-ID')}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </div>
            )}

            {!selectedWeek && selectedDiv && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📊</div>
                    Pilih <strong>bulan</strong> dan <strong>minggu</strong> untuk melihat rekap gaji
                </div>
            )}
        </div>
    );
}
