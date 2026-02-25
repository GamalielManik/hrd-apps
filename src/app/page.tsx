'use client';

import { useEffect, useState } from 'react';
import { Users, ClipboardList, Factory, Receipt, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCurrentPayrollWeek } from '@/lib/dateUtils';

export default function DashboardPage() {
  const [stats, setStats] = useState({ employees: 0, attendanceLogs: 0, productionLogs: 0 });
  const week = getCurrentPayrollWeek();

  useEffect(() => {
    async function load() {
      const [{ count: emp }, { count: att }, { count: prod }] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('attendance_logs').select('*', { count: 'exact', head: true }).gte('work_date', week.friday.toISOString().split('T')[0]),
        supabase.from('production_logs').select('*', { count: 'exact', head: true }).gte('work_date', week.friday.toISOString().split('T')[0]),
      ]);
      setStats({ employees: emp ?? 0, attendanceLogs: att ?? 0, productionLogs: prod ?? 0 });
    }
    load();
  }, []);

  const cards = [
    { label: 'Karyawan Aktif', value: stats.employees, icon: Users, href: '/karyawan', color: '#4f8ef7' },
    { label: 'Absensi Minggu Ini', value: stats.attendanceLogs, icon: ClipboardList, href: '/absensi', color: '#22c55e' },
    { label: 'Produksi Minggu Ini', value: stats.productionLogs, icon: Factory, href: '/produksi', color: '#a855f7' },
    { label: 'Lihat Slip Gaji', value: '→', icon: Receipt, href: '/slip-gaji', color: '#f59e0b' },
  ];

  const quickLinks = [
    { href: '/karyawan', label: 'Tambah Karyawan' },
    { href: '/tarif', label: 'Atur Tarif' },
    { href: '/absensi', label: 'Input Absensi' },
    { href: '/produksi', label: 'Input Produksi' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
            Periode aktif: <strong style={{ color: 'var(--accent)' }}>{week.label}</strong>
          </p>
        </div>
      </div>

      {/* Payroll cycle info */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.25)' }}>
        <TrendingUp size={20} color="var(--accent)" />
        <div>
          <div style={{ fontWeight: 600 }}>Siklus Penggajian: Jumat → Kamis</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Gajian setiap Jumat. Sabtu = libur (input diblokir).
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s', borderColor: 'var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ background: `${color}22`, borderRadius: 8, padding: '0.5rem' }}>
                  <Icon size={20} color={color} />
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="card">
        <h3 style={{ margin: '0 0 1rem' }}>Aksi Cepat</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {quickLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="btn btn-ghost">{label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
