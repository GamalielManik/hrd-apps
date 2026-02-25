'use client';

import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { EmployeePayrollSummary, PayrollWeek } from '@/types';

interface Props {
    summaries: EmployeePayrollSummary[];
    week: PayrollWeek;
}

function SingleSlip({ s, week }: { s: EmployeePayrollSummary; week: PayrollWeek }) {
    const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const periodLabel = `${format(week.friday, 'd MMMM yyyy', { locale: idLocale })} – ${format(week.thursday, 'd MMMM yyyy', { locale: idLocale })}`;
    const printDate = format(new Date(), 'd MMMM yyyy', { locale: idLocale });

    return (
        <div style={{
            border: '1.5px solid #333',
            borderRadius: 4,
            padding: '10px 14px',
            height: '99mm',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#fff',
            color: '#000',
            fontFamily: 'Arial, sans-serif',
            fontSize: '9pt',
            pageBreakInside: 'avoid',
        }}>
            {/* Header */}
            <div style={{ borderBottom: '1.5px solid #000', paddingBottom: 6, marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '11pt' }}>PT ULU PLASTIK</div>
                        <div style={{ fontSize: '8pt', color: '#555' }}>Tanda Terima Gaji Karyawan</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '8pt', color: '#555' }}>
                        <div>Periode:</div>
                        <div style={{ fontWeight: 600, color: '#000' }}>{periodLabel}</div>
                    </div>
                </div>
            </div>

            {/* Employee info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginBottom: 6 }}>
                <div><span style={{ color: '#555' }}>Nama: </span><strong>{s.employee.name}</strong></div>
                <div><span style={{ color: '#555' }}>Divisi: </span><strong>{s.employee.division}</strong></div>
                <div><span style={{ color: '#555' }}>Tipe: </span>{s.employee.worker_type === 'Daily' ? 'Harian' : 'Borongan'}</div>
                <div><span style={{ color: '#555' }}>Tanggal Cetak: </span>{printDate}</div>
            </div>

            {/* Earnings breakdown */}
            <div style={{ flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                    <tbody>
                        {s.employee.worker_type === 'Daily' && (
                            <>
                                <tr>
                                    <td style={{ padding: '2px 0', color: '#555' }}>Hari Hadir</td>
                                    <td style={{ textAlign: 'right', color: '#555' }}>× {fmt(s.employee.base_daily_rate)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(s.days_present * s.employee.base_daily_rate)}</td>
                                </tr>
                                {s.total_ot_hours > 0 && (
                                    <tr>
                                        <td style={{ padding: '2px 0', color: '#555' }}>Lembur ({s.total_ot_hours} jam)</td>
                                        <td style={{ textAlign: 'right', color: '#555' }}>× {fmt(s.employee.overtime_rate_per_hour)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(s.total_ot_hours * s.employee.overtime_rate_per_hour)}</td>
                                    </tr>
                                )}
                            </>
                        )}
                        {s.borongan_pay > 0 && (
                            <tr>
                                <td style={{ padding: '2px 0', color: '#555' }}>Hasil Produksi (Borongan)</td>
                                <td />
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(s.borongan_pay)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Total */}
            <div style={{
                borderTop: '2px solid #000',
                paddingTop: 6,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 4,
            }}>
                <div style={{ fontWeight: 700, fontSize: '10pt' }}>TOTAL GAJI</div>
                <div style={{ fontWeight: 700, fontSize: '12pt' }}>{fmt(s.total_pay)}</div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 4 }}>
                <div style={{ textAlign: 'center', width: '40%' }}>
                    <div style={{ borderTop: '1px solid #555', paddingTop: 4, marginTop: 30, fontSize: '8pt', color: '#555' }}>
                        Pembuat / HRD
                    </div>
                </div>
                <div style={{ textAlign: 'center', width: '40%' }}>
                    <div style={{ borderTop: '1px solid #555', paddingTop: 4, marginTop: 30, fontSize: '8pt', color: '#555' }}>
                        Penerima / {s.employee.name}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TandaTerima({ summaries, week }: Props) {
    // Group into pages of 3 slips each
    const pages: EmployeePayrollSummary[][] = [];
    for (let i = 0; i < summaries.length; i += 3) {
        pages.push(summaries.slice(i, i + 3));
    }

    return (
        <div className="slip-container">
            <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .slip-page { page-break-after: always; }
          .slip-page:last-child { page-break-after: avoid; }
        }
        @media screen {
          .slip-page {
            border: 1px dashed #2a2d3e;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 16px;
            background: #1a1d27;
          }
        }
      `}</style>

            {pages.map((page, pi) => (
                <div key={pi} className="slip-page" style={{ display: 'flex', flexDirection: 'column', gap: '3mm' }}>
                    {page.map(s => (
                        <SingleSlip key={s.employee.id} s={s} week={week} />
                    ))}
                    {/* Fill empty slots to maintain layout */}
                    {page.length < 3 && Array.from({ length: 3 - page.length }).map((_, i) => (
                        <div key={`empty-${i}`} style={{ height: '99mm', border: '1.5px dashed #ccc' }} />
                    ))}
                </div>
            ))}
        </div>
    );
}
