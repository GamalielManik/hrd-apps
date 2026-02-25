'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { RatesConfig } from '@/types';
import { SORTIR_ITEM_TYPES, PRODUCTION_CATEGORIES } from '@/types';

const EMPTY_FORM: Omit<RatesConfig, 'id'> = { category: '', item_name: null, rate_value: 0 };

// Preset categories
const CATEGORIES = [
    ...PRODUCTION_CATEGORIES,
    'Sembako_Rafia', 'Sembako_Sortir', 'Sembako_Peletan', 'Sembako_Oplosan',
    'Sembako_Supir', 'Sembako_Mandor',
];

export default function TarifPage() {
    const [rates, setRates] = useState<RatesConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<RatesConfig | null>(null);
    const [form, setForm] = useState<Omit<RatesConfig, 'id'>>(EMPTY_FORM);

    async function load() {
        setLoading(true);
        const { data } = await supabase.from('rates_config').select('*').order('category').order('item_name');
        setRates(data ?? []);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    function openAdd() {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    }

    function openEdit(r: RatesConfig) {
        setEditTarget(r);
        const { id, ...rest } = r;
        setForm(rest);
        setShowModal(true);
    }

    async function save() {
        if (!form.category || form.rate_value <= 0) return alert('Kategori & tarif wajib diisi.');
        const payload = {
            ...form,
            item_name: form.category === 'Sortir' ? form.item_name : null,
        };
        if (editTarget) {
            await supabase.from('rates_config').update(payload).eq('id', editTarget.id);
        } else {
            await supabase.from('rates_config').insert(payload);
        }
        setShowModal(false);
        load();
    }

    async function remove(id: string) {
        if (!confirm('Hapus tarif ini?')) return;
        await supabase.from('rates_config').delete().eq('id', id);
        load();
    }

    const grouped = rates.reduce<Record<string, RatesConfig[]>>((acc, r) => {
        acc[r.category] = acc[r.category] ?? [];
        acc[r.category].push(r);
        return acc;
    }, {});

    const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Tarif</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                        Konfigurasi tarif harian, lembur, borongan, dan sembako
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Tambah Tarif</button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Memuat...</div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    Belum ada tarif. Klik &quot;Tambah Tarif&quot; untuk mulai.
                </div>
            ) : (
                Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="card" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ margin: '0 0 1rem', color: 'var(--accent)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {category}
                        </h3>
                        <table className="ippl-table">
                            <thead>
                                <tr>
                                    <th>Kategori</th>
                                    <th>Item</th>
                                    <th>Tarif (Rp)</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(r => (
                                    <tr key={r.id}>
                                        <td>{r.category}</td>
                                        <td>{r.item_name ?? <span style={{ color: 'var(--text-secondary)' }}>—</span>}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmt(r.rate_value)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn btn-ghost" style={{ padding: '0.35rem 0.65rem' }} onClick={() => openEdit(r)}><Pencil size={13} /></button>
                                                <button className="btn btn-danger" style={{ padding: '0.35rem 0.65rem' }} onClick={() => remove(r.id)}><Trash2 size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>{editTarget ? 'Edit Tarif' : 'Tambah Tarif'}</h2>
                            <button className="btn btn-ghost" style={{ padding: '0.35rem' }} onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label>Kategori *</label>
                                <select className="ippl-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, item_name: null }))}>
                                    <option value="">-- Pilih Kategori --</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {form.category === 'Sortir' && (
                                <div>
                                    <label>Item Sortir *</label>
                                    <select className="ippl-select" value={form.item_name ?? ''} onChange={e => setForm(f => ({ ...f, item_name: e.target.value || null }))}>
                                        <option value="">-- Pilih Item --</option>
                                        {SORTIR_ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label>Nilai Tarif (Rp) *</label>
                                <input className="ippl-input" type="number" value={form.rate_value} onChange={e => setForm(f => ({ ...f, rate_value: Number(e.target.value) }))} />
                            </div>
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
