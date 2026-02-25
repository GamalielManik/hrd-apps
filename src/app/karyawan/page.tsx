'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Power, X, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Employee, WorkerType, Division } from '@/types';
import { DIVISIONS_FALLBACK } from '@/types';

const EMPTY_FORM: Omit<Employee, 'id'> = {
    name: '', division: '', worker_type: 'Daily',
    base_daily_rate: 0, overtime_rate_per_hour: 0, is_active: true,
};

// ── Currency input helpers ────────────────────────────────────
/** Format number → "85,000" */
function formatRupiah(val: number): string {
    if (!val) return '';
    return val.toLocaleString('id-ID');
}
/** Parse "85,000" or "85000" → 85000 */
function parseRupiah(str: string): number {
    const cleaned = str.replace(/[^0-9]/g, '');
    return cleaned === '' ? 0 : parseInt(cleaned, 10);
}

export default function KaryawanPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [divisions, setDivisions] = useState<string[]>(DIVISIONS_FALLBACK);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Employee | null>(null);
    const [form, setForm] = useState<Omit<Employee, 'id'>>(EMPTY_FORM);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
    // Displayed string values for Rupiah inputs (allows empty + commas)
    const [dailyRateStr, setDailyRateStr] = useState('');
    const [otRateStr, setOtRateStr] = useState('');

    async function load() {
        setLoading(true);
        const [{ data: emps }, { data: divs }] = await Promise.all([
            supabase.from('employees').select('*').order('division').order('name'),
            supabase.from('divisions').select('*').eq('is_active', true).order('name'),
        ]);
        setEmployees(emps ?? []);
        if (divs && divs.length > 0) {
            setDivisions((divs as Division[]).map(d => d.name));
        }
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    function openAdd() {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setDailyRateStr('');
        setOtRateStr('');
        setShowModal(true);
    }

    function openEdit(emp: Employee) {
        setEditTarget(emp);
        const { id, ...rest } = emp;
        void id;
        setForm(rest);
        setDailyRateStr(formatRupiah(emp.base_daily_rate));
        setOtRateStr(formatRupiah(emp.overtime_rate_per_hour));
        setShowModal(true);
    }

    async function save() {
        if (!form.name || !form.division) return alert('Nama dan divisi wajib diisi.');
        if (editTarget) {
            await supabase.from('employees').update(form).eq('id', editTarget.id);
        } else {
            await supabase.from('employees').insert(form);
        }
        setShowModal(false);
        load();
    }

    async function toggleActive(emp: Employee) {
        const action = emp.is_active ? 'nonaktifkan' : 'aktifkan';
        if (!confirm(`${action} ${emp.name}?`)) return;
        await supabase.from('employees').update({ is_active: !emp.is_active }).eq('id', emp.id);
        load();
    }

    const filtered = employees.filter(e =>
        filter === 'all' ? true : filter === 'active' ? e.is_active : !e.is_active
    );

    const groupedByDivision = filtered.reduce<Record<string, Employee[]>>((acc, e) => {
        acc[e.division] = acc[e.division] ?? [];
        acc[e.division].push(e);
        return acc;
    }, {});

    const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Karyawan</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                        {employees.filter(e => e.is_active).length} karyawan aktif
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                        <select className="ippl-select" style={{ paddingRight: '2rem', width: 'auto' }}
                            value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
                            <option value="active">Aktif</option>
                            <option value="inactive">Non-aktif</option>
                            <option value="all">Semua</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '0.5rem', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Tambah</button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Memuat...</div>
            ) : (
                Object.entries(groupedByDivision).map(([division, emps]) => (
                    <div key={division} className="card" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ margin: '0 0 1rem', color: 'var(--accent)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {division} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>· {emps.length}</span>
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ippl-table">
                                <thead>
                                    <tr>
                                        <th>Nama</th>
                                        <th>Tipe</th>
                                        <th>Tarif Harian</th>
                                        <th>Tarif Lembur/Jam</th>
                                        <th>Status</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {emps.map(emp => (
                                        <tr key={emp.id}>
                                            <td style={{ fontWeight: 500 }}>{emp.name}</td>
                                            <td>
                                                <span className={`badge ${emp.worker_type === 'Daily' ? 'badge-daily' : 'badge-piece'}`}>
                                                    {emp.worker_type === 'Daily' ? 'Harian' : 'Borongan'}
                                                </span>
                                            </td>
                                            <td>{fmt(emp.base_daily_rate)}</td>
                                            <td>{emp.worker_type === 'Daily' ? fmt(emp.overtime_rate_per_hour) : '—'}</td>
                                            <td>
                                                <span className={`badge ${emp.is_active ? 'badge-hadir' : 'badge-alpha'}`}>
                                                    {emp.is_active ? 'Aktif' : 'Non-aktif'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.65rem' }} onClick={() => openEdit(emp)}>
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.65rem', color: emp.is_active ? 'var(--danger)' : 'var(--success)' }} onClick={() => toggleActive(emp)}>
                                                        <Power size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>{editTarget ? 'Edit Karyawan' : 'Tambah Karyawan'}</h2>
                            <button className="btn btn-ghost" style={{ padding: '0.35rem' }} onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label>Nama Lengkap *</label>
                                <input className="ippl-input" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Nama karyawan" />
                            </div>
                            <div>
                                <label>Divisi *</label>
                                <select className="ippl-select" value={form.division}
                                    onChange={e => setForm(f => ({ ...f, division: e.target.value }))}>
                                    <option value="">-- Pilih Divisi --</option>
                                    {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                                    Kelola divisi di menu <strong>Tarif → Divisi</strong>
                                </div>
                            </div>
                            <div>
                                <label>Tipe Karyawan *</label>
                                <select className="ippl-select" value={form.worker_type}
                                    onChange={e => setForm(f => ({ ...f, worker_type: e.target.value as WorkerType }))}>
                                    <option value="Daily">Harian (Daily)</option>
                                    <option value="Piece-rate">Borongan (Piece-rate)</option>
                                </select>
                            </div>
                            <div>
                                <label>Tarif Harian (Rp)</label>
                                <input
                                    className="ippl-input"
                                    inputMode="numeric"
                                    placeholder="Contoh: 85,000"
                                    value={dailyRateStr}
                                    onChange={e => {
                                        // Allow digits and commas only
                                        const raw = e.target.value.replace(/[^0-9,]/g, '');
                                        setDailyRateStr(raw);
                                        setForm(f => ({ ...f, base_daily_rate: parseRupiah(raw) }));
                                    }}
                                    onBlur={() => {
                                        // Auto-format on leave
                                        const num = parseRupiah(dailyRateStr);
                                        setDailyRateStr(num > 0 ? formatRupiah(num) : '');
                                        setForm(f => ({ ...f, base_daily_rate: num }));
                                    }}
                                />
                                {form.base_daily_rate > 0 && (
                                    <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.3rem' }}>
                                        = Rp {form.base_daily_rate.toLocaleString('id-ID')}
                                    </div>
                                )}
                            </div>
                            {form.worker_type === 'Daily' && (
                                <div>
                                    <label>Tarif Lembur per Jam (Rp)</label>
                                    <input
                                        className="ippl-input"
                                        inputMode="numeric"
                                        placeholder="Contoh: 12,500"
                                        value={otRateStr}
                                        onChange={e => {
                                            const raw = e.target.value.replace(/[^0-9,]/g, '');
                                            setOtRateStr(raw);
                                            setForm(f => ({ ...f, overtime_rate_per_hour: parseRupiah(raw) }));
                                        }}
                                        onBlur={() => {
                                            const num = parseRupiah(otRateStr);
                                            setOtRateStr(num > 0 ? formatRupiah(num) : '');
                                            setForm(f => ({ ...f, overtime_rate_per_hour: num }));
                                        }}
                                    />
                                    {form.overtime_rate_per_hour > 0 && (
                                        <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.3rem' }}>
                                            = Rp {form.overtime_rate_per_hour.toLocaleString('id-ID')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                            <button className="btn btn-primary" onClick={save}>Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
