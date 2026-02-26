'use client';

import type { EmployeeSlipRow } from '@/app/slip-gaji/page';
import type { PayrollWeek } from '@/types';

interface Props {
  division: string;
  week: PayrollWeek;
  rows: EmployeeSlipRow[];
  onBack: () => void;
}

// Fix: Math.round() — no decimal digits (506.111 not 506.111,111)
const fmt = (n: number) => Math.round(n).toLocaleString('id-ID');

export default function SlipGajiDivisi({ division, week, rows, onBack }: Props) {
  const totalHariKerja = rows.reduce((s, r) => s + r.hari_kerja, 0);
  const totalKerja = rows.reduce((s, r) => s + r.total_kerja, 0);
  const totalUpahLembur = rows.reduce((s, r) => s + r.upah_lembur, 0);
  const totalSetengahJam = rows.reduce((s, r) => s + r.setengah_hari_jam, 0);
  const totalUpahSetengah = rows.reduce((s, r) => s + r.upah_setengah_hari, 0);
  const grandTotal = rows.reduce((s, r) => s + r.total_upah, 0);

  return (
    <>
      {/* Toolbar — hidden on print */}
      <div className="no-print" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button className="btn btn-ghost" onClick={onBack}>← Kembali</button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          🖨 Cetak Sekarang
        </button>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          A4 Portrait · Margin rapat atas
        </span>
      </div>

      {/* Print area */}
      <div className="print-area">
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 15mm 15mm 15mm;
            }
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
            }
            .no-print { display: none !important; }
          }

          .print-area {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            color: #000;
            background: #fff;
            padding: 0;
          }

          /* ── Header ── */
          .slip-company {
            font-size: 12pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
          }
          .slip-period {
            font-size: 8.5pt;
            text-align: center;
            color: #444;
            margin: 2pt 0 0;
          }
          .slip-division {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 8pt 0 0;
            padding-bottom: 3pt;
            border-bottom: 2px solid #000;
          }

          /* ── Table ── */
          .slip-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5pt;
            font-size: 8.5pt;
          }
          .slip-table th, .slip-table td {
            border: 1px solid #888;
            padding: 3pt 4pt;
          }
          .slip-table thead tr {
            background: #e8e8e8;
            font-weight: bold;
            text-align: center;
            font-size: 7.5pt;
            line-height: 1.3;
          }
          .slip-table tbody tr:nth-child(even) {
            background: #f7f7f7;
          }
          .slip-table tfoot tr {
            background: #e8e8e8;
            font-weight: bold;
            border-top: 2px solid #000;
          }

          .num { text-align: right; font-variant-numeric: tabular-nums; }
          .ctr { text-align: center; }
          .zero { text-align: center; color: #bbb; }

          /* ── Signature ── */
          .slip-footer {
            margin-top: 14pt;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 9pt;
          }
          .sign-box {
            text-align: center;
            width: 110pt;
          }
          .sign-label {
            font-size: 8.5pt;
            margin-bottom: 0;
          }
          .sign-role {
            font-size: 8.5pt;
            font-weight: bold;
            margin-top: 28pt;
            border-top: 1px solid #000;
            padding-top: 3pt;
          }
          .print-date {
            font-size: 7pt;
            color: #888;
            text-align: right;
            align-self: flex-end;
          }
        `}</style>

        {/* Letter head */}
        <p className="slip-company">PT ULU PLASTIK</p>
        <p className="slip-period">Rekap Upah Karyawan — Periode: {week.label}</p>
        <p className="slip-division">{division}</p>

        {/* Main table — rows only as many as employees (no empty padding rows) */}
        <table className="slip-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: 22 }}>No</th>
              <th rowSpan={2} style={{ minWidth: 80, textAlign: 'left' }}>NAMA</th>
              <th rowSpan={2}>HARI<br />KERJA</th>
              <th rowSpan={2}>TARIF<br />KERJA</th>
              <th rowSpan={2}>TOTAL</th>
              <th rowSpan={2}>LEMBUR</th>
              <th rowSpan={2}>TARIF<br />LEMBUR</th>
              <th rowSpan={2}>UPAH<br />LEMBUR</th>
              <th colSpan={2}>½ HARI</th>
              <th rowSpan={2}>TOTAL<br />UPAH</th>
            </tr>
            <tr>
              <th>JAM</th>
              <th>UPAH</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="ctr">{r.no}</td>
                <td style={{ fontWeight: 600 }}>{r.nama}</td>
                <td className="ctr">{r.hari_kerja > 0 ? r.hari_kerja : <span className="zero">0</span>}</td>
                <td className="num">{fmt(r.tarif_kerja)}</td>
                <td className="num">{fmt(r.total_kerja)}</td>
                <td className="ctr">{r.lembur > 0 ? r.lembur : <span className="zero">0</span>}</td>
                <td className="num">{fmt(r.tarif_lembur)}</td>
                <td className="num">{r.upah_lembur > 0 ? fmt(r.upah_lembur) : <span className="zero">0</span>}</td>
                <td className="ctr">{r.setengah_hari_jam > 0 ? r.setengah_hari_jam : <span className="zero">0</span>}</td>
                <td className="num">{r.upah_setengah_hari > 0 ? fmt(r.upah_setengah_hari) : <span className="zero">0</span>}</td>
                <td className="num" style={{ fontWeight: 700 }}>{fmt(r.total_upah)}</td>
              </tr>
            ))}
            {/* NO empty buffer rows — table only as tall as needed */}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ textAlign: 'right' }}>TOTAL</td>
              <td className="ctr">{totalHariKerja}</td>
              <td />
              <td className="num">{fmt(totalKerja)}</td>
              <td />
              <td />
              <td className="num">{fmt(totalUpahLembur)}</td>
              <td className="ctr">{totalSetengahJam > 0 ? totalSetengahJam : 0}</td>
              <td className="num">{fmt(totalUpahSetengah)}</td>
              <td className="num">{fmt(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Signature — 3 boxes: Menyetujui/Keuangan | Menerima/Karyawan | Dibuat Oleh/HRD */}
        <div className="slip-footer">
          <div className="sign-box">
            <div className="sign-label">Menyetujui,</div>
            <div className="sign-role">( Keuangan )</div>
          </div>
          <div className="sign-box">
            <div className="sign-label">Menerima,</div>
            <div className="sign-role">( Karyawan )</div>
          </div>
          <div className="sign-box">
            <div className="sign-label">Dibuat Oleh,</div>
            <div className="sign-role">( HRD )</div>
          </div>
          <div className="print-date">
            Dicetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </>
  );
}
