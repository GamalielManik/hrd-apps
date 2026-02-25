'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
    getCurrentPayrollWeek, nextPayrollWeek, prevPayrollWeek,
    toISODateString, getAllWeekDays, isSaturday,
} from '@/lib/dateUtils';
import type { Employee, EmployeePayrollSummary, PayrollWeek } from '@/types';
import TandaTerima from '@/components/TandaTerima';

export default function SlipGajiPage() {
    const [week, setWeek] = useState<PayrollWeek>(getCurrentPayrollWeek);
    const [summaries, setSummaries] = useState<EmployeePayrollSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [printMode, setPrintMode] = useState(false);

    const days = getAllWeekDays(week).filter(d => !isSaturday(d));

    async function calculate() {
        setLoading(true);
        const startStr = toISODateString(week.friday);
        const endStr = toISODateString(week.thursday);

        const [{ data: emps }, { data: att }, { data: prod }] = await Promise.all([
            supabase.from('employees').select('*').eq('is_active', true),
            supabase.from('attendance_logs').select('*').gte('work_date', startStr).lte('work_date', endStr),
            supabase.from('production_logs').select('*').gte('work_date', startStr).lte('work_date', endStr),
        ]);

        const employees = (emps ?? []) as Employee[];

        const result: EmployeePayrollSummary[] = employees.map(emp => {
            const myAtt = (att ?? []).filter(a => a.employee_id === emp.id);
            const myProd = (prod ?? []).filter(p => p.employee_id === emp.id);

            const days_present = myAtt.filter(a => a.status === 'Hadir').length;
            const total_ot_hours = myAtt.reduce((s: number, a: { overtime_hours: number }) => s + a.overtime_hours, 0);
            const daily_pay = (days_present * emp.base_daily_rate) + (total_ot_hours * emp.overtime_rate_per_hour);
            const borongan_pay = myProd.reduce((s: number, p: { quantity: number; rate_snapshot: number }) => s + p.quantity * p.rate_snapshot, 0);

            return {
                employee: emp,
                days_present,
                total_ot_hours,
                daily_pay,
                borongan_pay,
                total_pay: daily_pay + borongan_pay,
            };
        });

        setSummaries(result.filter(s => s.total_pay > 0 || s.days_present > 0));
        setLoading(false);
    }

    useEffect(() => { calculate(); }, [week]);

    const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const grandTotal = summaries.reduce((s, r) => s + r.total_pay, 0);

    if (printMode) {
        return (
            <div>
                <div className="no-print" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-ghost" onClick={() => setPrintMode(false)}>← Kembali</button>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        <Printer size={16} /> Cetak Sekarang
                    </button>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', alignSelf: 'center' }}>
                        Layout: 3 slip per halaman A4
                    </span>
                </div>
                <TandaTerima summaries={summaries} week={week} />
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Slip Gaji</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                        Rekap penggajian & cetak Tanda Terima
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setPrintMode(true)} disabled={summaries.length === 0}>
                    <Printer size={16} /> Cetak Tanda Terima
                </button>
            </div>

            {/* Week navigation */}
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

            {/* Summary table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Menghitung...</div>
            ) : (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Rekap Gaji — {week.label}</h3>
                        <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1.1rem' }}>
                            Grand Total: {fmt(grandTotal)}
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="ippl-table">
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Divisi</th>
                                    <th>Tipe</th>
                                    <th style={{ textAlign: 'center' }}>Hadir</th>
                                    <th style={{ textAlign: 'center' }}>OT (jam)</th>
                                    <th style={{ textAlign: 'right' }}>Gaji Harian</th>
                                    <th style={{ textAlign: 'right' }}>Borongan</th>
                                    <th style={{ textAlign: 'right', color: 'var(--accent)' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaries.length === 0 ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Belum ada data untuk periode ini</td></tr>
                                ) : summaries.map(s => (
                                    <tr key={s.employee.id}>
                                        <td style={{ fontWeight: 500 }}>{s.employee.name}</td>
                                        <td>{s.employee.division}</td>
                                        <td>
                                            <span className={`badge ${s.employee.worker_type === 'Daily' ? 'badge-daily' : 'badge-piece'}`}>
                                                {s.employee.worker_type === 'Daily' ? 'Harian' : 'Borongan'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{s.days_present}</td>
                                        <td style={{ textAlign: 'center' }}>{s.total_ot_hours || '—'}</td>
                                        <td style={{ textAlign: 'right' }}>{s.daily_pay > 0 ? fmt(s.daily_pay) : '—'}</td>
                                        <td style={{ textAlign: 'right' }}>{s.borongan_pay > 0 ? fmt(s.borongan_pay) : '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{fmt(s.total_pay)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {summaries.length > 0 && (
                                <tfoot>
                                    <tr>
                                        <td colSpan={5} />
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(summaries.reduce((s, r) => s + r.daily_pay, 0))}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(summaries.reduce((s, r) => s + r.borongan_pay, 0))}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)', fontSize: '1rem' }}>{fmt(grandTotal)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
