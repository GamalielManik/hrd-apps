'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Power, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Division } from '@/types';

export default function DivisiPage() {
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Division | null>(null);
    const [formName, setFormName] = useState('');
    const [saving, setSaving] = useState(false);

    async function load() {
        setLoading(true);
        const { data } = await supabase.from('divisions').select('*').order('name');
        setDivisions(data ?? []);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    function openAdd() {
        setEditTarget(null);
        setFormName('');
        setShowModal(true);
    }

    function openEdit(d: Division) {
        setEditTarget(d);
        setFormName(d.name);
        setShowModal(true);
    }

    async function save() {
        if (!formName.trim()) return alert('Nama divisi tidak boleh kosong.');
        setSaving(true);
        if (editTarget) {
            await supabase.from('divisions').update({ name: formName.trim() }).eq('id', editTarget.id);
        } else {
            await supabase.from('divisions').insert({ name: formName.trim() });
        }
        setSaving(false);
        setShowModal(false);
        load();
    }

    async function toggleActive(d: Division) {
        const action = d.is_active ? 'nonaktifkan' : 'aktifkan';
        if (!confirm(`${action} divisi "${d.name}"?`)) return;
        await supabase.from('divisions').update({ is_active: !d.is_active }).eq('id', d.id);
        load();
    }

    async function remove(d: Division) {
        if (!confirm(`Hapus divisi "${d.name}"? Pastikan tidak ada karyawan di divisi ini.`)) return;
        await supabase.from('divisions').delete().eq('id', d.id);
        load();
    }

    const active = divisions.filter(d => d.is_active);
    const inactive = divisions.filter(d => !d.is_active);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Manajemen Divisi</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                        {active.length} divisi aktif · {inactive.length} non-aktif
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Tambah Divisi</button>
            </div>

            {/* Info */}
            <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                💡 Divisi yang ditambah di sini akan <strong style={{ color: 'var(--text-primary)' }}>otomatis muncul</strong> di dropdown saat menambah karyawan.
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Memuat...</div>
            ) : (
                <div className="card">
                    <table className="ippl-table">
                        <thead>
                            <tr>
                                <th>Nama Divisi</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th style={{ textAlign: 'center' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {divisions.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                                        Belum ada divisi. Klik &quot;Tambah Divisi&quot; untuk mulai.
                                    </td>
                                </tr>
                            ) : divisions.map(d => (
                                <tr key={d.id}>
                                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`badge ${d.is_active ? 'badge-hadir' : 'badge-alpha'}`}>
                                            {d.is_active ? 'Aktif' : 'Non-aktif'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <button className="btn btn-ghost" style={{ padding: '0.35rem 0.65rem' }}
                                                title="Edit nama" onClick={() => openEdit(d)}>
                                                <Pencil size={13} />
                                            </button>
                                            <button className="btn btn-ghost" style={{ padding: '0.35rem 0.65rem', color: d.is_active ? 'var(--warning)' : 'var(--success)' }}
                                                title={d.is_active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => toggleActive(d)}>
                                                <Power size={13} />
                                            </button>
                                            <button className="btn btn-danger" style={{ padding: '0.35rem 0.65rem' }}
                                                title="Hapus divisi" onClick={() => remove(d)}>
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>{editTarget ? 'Edit Divisi' : 'Tambah Divisi'}</h2>
                            <button className="btn btn-ghost" style={{ padding: '0.35rem' }} onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        <div>
                            <label>Nama Divisi *</label>
                            <input
                                className="ippl-input"
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="Contoh: Produksi, Gudang, Security..."
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && save()}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                            <button className="btn btn-primary" onClick={save} disabled={saving}>
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
