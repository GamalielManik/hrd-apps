'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Employee, SembakoResult } from '@/types';

export default function SembakoPage() {
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());
    const [results, setResults] = useState<SembakoResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [rates, setRates] = useState<Record<string, number>>({});

    async function loadBase() {
        const [{ data: emps }, { data: rts }] = await Promise.all([
            supabase.from('employees').select('*').eq('is_active', true),
            supabase.from('rates_config').select('*').like('category', 'Sembako%'),
        ]);
        setEmployees(emps ?? []);
        const rateMap: Record<string, number> = {};
        (rts ?? []).forEach(r => { rateMap[r.category] = r.rate_value; });
        setRates(rateMap);
    }

    useEffect(() => { loadBase(); }, []);

    async function calculate() {
        setLoading(true);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const { data: prodLogs } = await supabase
            .from('production_logs')
            .select('*')
            .gte('work_date', startDate)
            .lte('work_date', endDate);

        if (!prodLogs) { setLoading(false); return; }

        // Group production value by employee → then sum by division
        const divisionProduction: Record<string, number> = {};
        prodLogs.forEach(log => {
            const emp = employees.find(e => e.id === log.employee_id);
            if (!emp) return;
            divisionProduction[emp.division] = (divisionProduction[emp.division] ?? 0) + (log.quantity * log.rate_snapshot);
        });

        const divisionWorkers: Record<string, number> = {};
        employees.forEach(emp => {
            divisionWorkers[emp.division] = (divisionWorkers[emp.division] ?? 0) + 1;
        });

        const res: SembakoResult[] = Object.keys(divisionProduction).map(division => {
            const sembakoRateKey = `Sembako_${division}`;
            const sembakoRate = rates[sembakoRateKey] ?? 0;
            const totalPool = divisionProduction[division] * (sembakoRate / 100 || 0.01); // e.g. 1% of production value
            const activeWorkers = divisionWorkers[division] ?? 1;
            return {
                division,
                total_pool: totalPool,
                active_workers: activeWorkers,
                incentive_per_person: totalPool / activeWorkers,
            };
        });

        setResults(res);
        setLoading(false);
    }

    const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const monthName = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: idLocale });

    const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
    const YEARS = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Kalkulator Sembako</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                        Insentif bulanan berbasis pool produksi per divisi
                    </p>
                </div>
            </div>

            {/* Period Selector */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem' }}>Pilih Periode</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                        <label>Bulan</label>
                        <select className="ippl-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                            {MONTHS.map(m => (
                                <option key={m} value={m}>{format(new Date(year, m - 1, 1), 'MMMM', { locale: idLocale })}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Tahun</label>
                        <select className="ippl-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={calculate} disabled={loading}>
                        {loading ? 'Menghitung...' : 'Hitung Sembako'}
                    </button>
                </div>

                {/* Formula info */}
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(79,142,247,0.08)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Formula Pool:</strong>
                    <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                        <li>Total Produksi Divisi (bulan) × Tarif Sembako Divisi → <strong>Total Pool</strong></li>
                        <li>Total Pool ÷ Jumlah Karyawan Aktif → <strong>Insentif per Orang</strong></li>
                    </ol>
                    <div style={{ marginTop: '0.5rem' }}>⚙ Atur tarif Sembako per divisi di menu <strong>Tarif</strong> (kategori: Sembako_Rafia, Sembako_Sortir, dll)</div>
                </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
                <div className="card">
                    <h3 style={{ margin: '0 0 1rem' }}>Hasil Sembako — {monthName}</h3>
                    <table className="ippl-table">
                        <thead>
                            <tr>
                                <th>Divisi</th>
                                <th style={{ textAlign: 'right' }}>Total Pool</th>
                                <th style={{ textAlign: 'center' }}>Karyawan Aktif</th>
                                <th style={{ textAlign: 'right' }}>Insentif / Orang</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map(r => (
                                <tr key={r.division}>
                                    <td style={{ fontWeight: 600 }}>{r.division}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(r.total_pool)}</td>
                                    <td style={{ textAlign: 'center' }}>{r.active_workers}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmt(r.incentive_per_person)}</td>
                                </tr>
                            ))}
                            <tr>
                                <td colSpan={2} />
                                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)', fontSize: '1rem', borderTop: '2px solid var(--border)' }}>
                                    Grand Total Pool: {fmt(results.reduce((s, r) => s + r.total_pool, 0))}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {results.length === 0 && !loading && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    Pilih periode lalu klik <strong>Hitung Sembako</strong>.
                </div>
            )}
        </div>
    );
}
