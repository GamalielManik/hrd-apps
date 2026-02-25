import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'IPPL — Payroll & Production | PT ULU PLASTIK',
  description: 'Integrated Payroll & Production System for PT Ulu Plastik',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className} suppressHydrationWarning style={{ margin: 0, display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', minHeight: '100vh' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
