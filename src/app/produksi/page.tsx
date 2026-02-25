'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toISODateString, isSaturday } from '@/lib/dateUtils';
import type { Employee, ProductionCategory, SortirItemType, ProductionLog, RatesConfig } from '@/types';
import { PRODUCTION_CATEGORIES, SORTIR_ITEM_TYPES } from '@/types';

export default function ProduksiPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [rates, setRates] = useState<RatesConfig[]>([]);
    const [logs, setLogs] = useState<(ProductionLog & { employee?: Employee })[]>([]);

    // Form state
    const [date, setDate] = useState(toISODateString(new Date()));
    const [empId, setEmpId] = useState('');
    const [category, setCategory] = useState<ProductionCategory>('Rafia');
    const [itemType, setItemType] = useState<SortirItemType>('rongsok');
    const [qty, setQty] = useState<number>(0);
    const [saving, setSaving] = useState(false);
    const [dateError, setDateError] = useState('');

    const selectedDate = new Date(date + 'T00:00:00');
    const isSat = isSaturday(selectedDate);

    async function loadAll() {
        const [{ data: emps }, { data: rts }, { data: lgx }] = await Promise.all([
            supabase.from('employees').select('*').eq('is_active', true).eq('worker_type', 'Piece-rate').order('name'),
            supabase.from('rates_config').select('*'),
            supabase.from('production_logs').select('*').order('work_date', { ascending: false }).limit(50),
        ]);
        setEmployees(emps ?? []);
        setRates(rts ?? []);
        setLogs(lgx ?? []);
        if (emps && emps.length > 0 && !empId) setEmpId(emps[0].id);
    }

    useEffect(() => { loadAll(); }, []);

    function getRate(): number {
        if (category === 'Sortir') {
            return rates.find(r => r.category === 'Sortir' && r.item_name === itemType)?.rate_value ?? 0;
        }
        return rates.find(r => r.category === category && !r.item_name)?.rate_value ?? 0;
    }

    async function save() {
        if (isSat) { setDateError('Saturday is OFF — tidak boleh input produksi di hari Sabtu.'); return; }
        if (!empId || qty <= 0) return alert('Pilih karyawan dan masukkan jumlah > 0.');
        const rateSnapshot = getRate();
        if (rateSnapshot === 0) return alert(`Tarif untuk ${category}${category === 'Sortir' ? ` / ${itemType}` : ''} belum diatur. Silakan atur di menu Tarif.`);

        setSaving(true);
        const { error } = await supabase.from('production_logs').insert({
            employee_id: empId,
            work_date: date,
            category,
            item_type: category === 'Sortir' ? itemType : null,
            quantity: qty,
            rate_snapshot: rateSnapshot,
        });
        setSaving(false);
        if (error) alert('Gagal: ' + error.message);
        else { setQty(0); loadAll(); }
    }

    async function remove(id: string) {
        if (!confirm('Hapus entri ini?')) return;
        await supabase.from('production_logs').delete().eq('id', id);
        loadAll();
    }

    const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const empMap = Object.fromEntries(employees.map(e => [e.id, e.name]));

    const currentRate = getRate();

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Produksi (Borongan)</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                        Input hasil produksi untuk karyawan <strong>Piece-rate</strong>
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem' }}>Tambah Entri Produksi</h3>

                {isSat && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 8, color: 'var(--saturday)', fontSize: '0.875rem' }}>
                        🔴 <strong>SABTU = LIBUR</strong> — Input produksi tidak diperbolehkan pada hari Sabtu.
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label>Tanggal Kerja *</label>
                        <input type="date" className="ippl-input" value={date}
                            onChange={e => { setDate(e.target.value); setDateError(''); }} />
                        {dateError && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4 }}>{dateError}</div>}
                    </div>

                    <div>
                        <label>Karyawan *</label>
                        <select className="ippl-select" value={empId} onChange={e => setEmpId(e.target.value)}>
                            {employees.length === 0
                                ? <option>-- Belum ada karyawan borongan --</option>
                                : employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.division})</option>)
                            }
                        </select>
                    </div>

                    <div>
                        <label>Kategori Produksi *</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {PRODUCTION_CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    style={{
                                        padding: '0.4rem 0.85rem',
                                        borderRadius: 6,
                                        border: '1px solid',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: category === cat ? 700 : 400,
                                        background: category === cat ? 'var(--accent)' : 'var(--bg-base)',
                                        color: category === cat ? '#fff' : 'var(--text-secondary)',
                                        borderColor: category === cat ? 'var(--accent)' : 'var(--border)',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sortir item type toggle */}
                    {category === 'Sortir' && (
                        <div>
                            <label>Jenis Item (Sortir) *</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {SORTIR_ITEM_TYPES.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setItemType(t)}
                                        style={{
                                            padding: '0.35rem 0.7rem',
                                            borderRadius: 6,
                                            border: '1px solid',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: itemType === t ? 700 : 400,
                                            background: itemType === t ? '#a855f7' : 'var(--bg-base)',
                                            color: itemType === t ? '#fff' : 'var(--text-secondary)',
                                            borderColor: itemType === t ? '#a855f7' : 'var(--border)',
                                            transition: 'all 0.15s',
                                            textTransform: 'capitalize',
                                        }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label>Jumlah (Kg / Unit) *</label>
                        <input type="number" className="ippl-input" min={0} step={0.1} value={qty}
                            onChange={e => setQty(Number(e.target.value))} />
                    </div>

                    <div>
                        <label>Preview</label>
                        <div style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                Tarif: {currentRate > 0 ? fmt(currentRate) + '/unit' : <span style={{ color: 'var(--danger)' }}>⚠ Belum diatur</span>}
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1rem', marginTop: 2 }}>
                                = {fmt(qty * currentRate)}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary" onClick={save} disabled={saving || isSat}>
                        <Plus size={16} /> {saving ? 'Menyimpan...' : 'Tambah Entri'}
                    </button>
                </div>
            </div>

            {/* Recent logs */}
            <div className="card">
                <h3 style={{ margin: '0 0 1rem' }}>Riwayat Produksi (50 terakhir)</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="ippl-table">
                        <thead>
                            <tr>
                                <th>Tanggal</th>
                                <th>Karyawan</th>
                                <th>Kategori</th>
                                <th>Item</th>
                                <th>Jumlah</th>
                                <th>Tarif</th>
                                <th>Total</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Belum ada data</td></tr>
                            ) : logs.map(log => (
                                <tr key={log.id}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{log.work_date}</td>
                                    <td>{empMap[log.employee_id] ?? log.employee_id.slice(0, 8)}</td>
                                    <td>
                                        <span className="badge" style={{ background: 'rgba(79,142,247,0.12)', color: 'var(--accent)' }}>{log.category}</span>
                                    </td>
                                    <td style={{ textTransform: 'capitalize' }}>{log.item_type ?? '—'}</td>
                                    <td>{log.quantity}</td>
                                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{fmt(log.rate_snapshot)}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{fmt(log.quantity * log.rate_snapshot)}</td>
                                    <td>
                                        <button className="btn btn-danger" style={{ padding: '0.3rem 0.55rem' }} onClick={() => remove(log.id)}><Trash2 size={13} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
