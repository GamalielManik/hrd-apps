'use client';

import type { EmployeeSlipRow } from '@/app/slip-gaji/page';
import type { PayrollWeek } from '@/types';

interface Props {
    division: string;
    week: PayrollWeek;
    rows: EmployeeSlipRow[];
    onBack: () => void;
}

const fmt = (n: number) => n.toLocaleString('id-ID');

export default function SlipGajiDivisi({ division, week, rows, onBack }: Props) {
    const totalHariKerja = rows.reduce((s, r) => s + r.hari_kerja, 0);
    const totalKerja = rows.reduce((s, r) => s + r.total_kerja, 0);
    const totalUpahLembur = rows.reduce((s, r) => s + r.upah_lembur, 0);
    const totalSetengahJam = rows.reduce((s, r) => s + r.setengah_hari_jam, 0);
    const totalUpahSetengah = rows.reduce((s, r) => s + r.upah_setengah_hari, 0);
    const grandTotal = rows.reduce((s, r) => s + r.total_upah, 0);

    return (
        <>
            {/* Toolbar (hidden on print) */}
            <div className="no-print" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button className="btn btn-ghost" onClick={onBack}>← Kembali</button>
                <button className="btn btn-primary" onClick={() => window.print()}>
                    🖨 Cetak Sekarang
                </button>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    Format A4 Portrait · Margin 15mm
                </span>
            </div>

            {/* Print area */}
            <div className="print-area">
                <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
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

          .slip-header {
            margin-bottom: 8pt;
          }
          .slip-header .company {
            font-size: 11pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .slip-header .period {
            font-size: 9pt;
            text-align: center;
            color: #444;
            margin-top: 2pt;
          }
          .slip-header .division {
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 10pt;
            padding: 4pt 0;
            border-bottom: 2px solid #000;
          }

          .slip-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6pt;
            font-size: 9pt;
          }
          .slip-table th, .slip-table td {
            border: 1px solid #888;
            padding: 4pt 5pt;
          }
          .slip-table thead tr {
            background: #e8e8e8;
            font-weight: bold;
            text-align: center;
            font-size: 8pt;
            line-height: 1.3;
          }
          .slip-table tbody tr:nth-child(even) {
            background: #f9f9f9;
          }
          .slip-table tfoot tr {
            background: #e8e8e8;
            font-weight: bold;
            border-top: 2px solid #000;
          }

          .num { text-align: right; font-variant-numeric: tabular-nums; }
          .ctr { text-align: center; }
          .no-val { text-align: center; color: #999; }

          .slip-footer {
            margin-top: 16pt;
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
          }
          .sign-box {
            text-align: center;
            width: 120pt;
          }
          .sign-line {
            border-bottom: 1px solid #000;
            margin: 32pt 0 4pt;
          }
        `}</style>

                {/* Letter head */}
                <div className="slip-header">
                    <div className="company">PT ULU PLASTIK</div>
                    <div className="period">
                        Rekap Upah Karyawan — Periode: {week.label}
                    </div>
                    <div className="division">{division}</div>
                </div>

                {/* Main table */}
                <table className="slip-table">
                    <thead>
                        <tr>
                            <th rowSpan={2} style={{ width: 24 }}>No</th>
                            <th rowSpan={2} style={{ minWidth: 90, textAlign: 'left' }}>NAMA</th>
                            <th rowSpan={2}>HARI<br />KERJA</th>
                            <th rowSpan={2}>TARIF<br />KERJA</th>
                            <th rowSpan={2}>TOTAL</th>
                            <th rowSpan={2}>LEMBUR</th>
                            <th rowSpan={2}>TARIF<br />LEMBUR</th>
                            <th rowSpan={2}>UPAH<br />LEMBUR</th>
                            <th colSpan={2} style={{ borderBottom: '1px solid #888' }}>½ HARI</th>
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
                                <td className="ctr">{r.hari_kerja > 0 ? r.hari_kerja : <span className="no-val">0</span>}</td>
                                <td className="num">{fmt(r.tarif_kerja)}</td>
                                <td className="num">{fmt(r.total_kerja)}</td>
                                <td className="ctr">{r.lembur > 0 ? r.lembur : <span className="no-val">0</span>}</td>
                                <td className="num">{fmt(r.tarif_lembur)}</td>
                                <td className="num">{r.upah_lembur > 0 ? fmt(r.upah_lembur) : <span className="no-val">0</span>}</td>
                                <td className="ctr">{r.setengah_hari_jam > 0 ? r.setengah_hari_jam : <span className="no-val">0</span>}</td>
                                <td className="num">{r.upah_setengah_hari > 0 ? fmt(r.upah_setengah_hari) : <span className="no-val">0</span>}</td>
                                <td className="num" style={{ fontWeight: 700 }}>{fmt(r.total_upah)}</td>
                            </tr>
                        ))}

                        {/* Empty buffer rows (minimum 10 rows to look like reference) */}
                        {Array.from({ length: Math.max(0, 10 - rows.length) }).map((_, i) => (
                            <tr key={`empty-${i}`} style={{ height: 18 }}>
                                <td className="ctr" style={{ color: '#ccc' }}>{rows.length + i + 1}</td>
                                <td /><td /><td /><td /><td /><td /><td /><td /><td /><td />
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                            <td className="ctr">{totalHariKerja}</td>
                            <td />
                            <td className="num">{fmt(totalKerja)}</td>
                            <td />
                            <td />
                            <td className="num">{fmt(totalUpahLembur)}</td>
                            <td className="ctr">{totalSetengahJam > 0 ? totalSetengahJam : 0}</td>
                            <td className="num">{fmt(totalUpahSetengah)}</td>
                            <td className="num" style={{ fontWeight: 700 }}>{fmt(grandTotal)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Signature section */}
                <div className="slip-footer">
                    <div className="sign-box">
                        <div>Mengetahui,</div>
                        <div className="sign-line" />
                        <div>( Pimpinan )</div>
                    </div>
                    <div className="sign-box">
                        <div>Dibuat oleh,</div>
                        <div className="sign-line" />
                        <div>( Admin / HRD )</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '8pt', color: '#666', alignSelf: 'flex-end' }}>
                        Dicetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                </div>
            </div>
        </>
    );
}
