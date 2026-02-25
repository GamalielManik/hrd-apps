'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Users, Settings, ClipboardList, Factory, ShoppingBasket,
    Receipt, LayoutDashboard, ChevronRight, LayoutGrid,
} from 'lucide-react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/karyawan', label: 'Karyawan', icon: Users },
    { href: '/divisi', label: 'Divisi', icon: LayoutGrid },
    { href: '/tarif', label: 'Tarif', icon: Settings },
    { href: '/absensi', label: 'Absensi', icon: ClipboardList },
    { href: '/produksi', label: 'Produksi', icon: Factory },
    { href: '/sembako', label: 'Sembako', icon: ShoppingBasket },
    { href: '/slip-gaji', label: 'Slip Gaji', icon: Receipt },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside style={{
            width: 240,
            minHeight: '100vh',
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '0',
            flexShrink: 0,
        }}>
            {/* Logo */}
            <div style={{
                padding: '1.5rem 1.25rem',
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                    PT ULU PLASTIK
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    IPPL System
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: '0.2rem' }}>
                    Payroll &amp; Production
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                    return (
                        <Link
                            key={href}
                            href={href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.65rem',
                                padding: '0.6rem 0.85rem',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? '#fff' : 'var(--text-secondary)',
                                background: isActive ? 'var(--accent)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.15s',
                                position: 'relative',
                            }}
                        >
                            <Icon size={16} />
                            <span style={{ flex: 1 }}>{label}</span>
                            {isActive && <ChevronRight size={14} />}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div style={{
                padding: '1rem 1.25rem',
                borderTop: '1px solid var(--border)',
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
            }}>
                v1.0.0 · Feb 2026
            </div>
        </aside>
    );
}
