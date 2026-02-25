// ============================================================
// IPPL – TypeScript Interfaces
// PT ULU PLASTIK — Integrated Payroll & Production System
// ============================================================

// ── Employee ─────────────────────────────────────────────────
export type WorkerType = 'Daily' | 'Piece-rate';

export interface Employee {
  id: string;
  name: string;
  division: string;
  worker_type: WorkerType;
  base_daily_rate: number;
  overtime_rate_per_hour: number;
  is_active: boolean;
}

// ── Rates Config ─────────────────────────────────────────────
export type SortirItemType = 'rongsok' | 'sak' | 'packing' | 'terpal';
export type ProductionCategory = 'Rafia' | 'Peletan' | 'Sortir' | 'Oplosan';
export type AttendanceStatus = 'Hadir' | 'Izin' | 'Alpha';

export interface RatesConfig {
  id: string;
  category: string;     // 'Sortir', 'Rafia', 'Peletan', 'Oplosan', 'Sembako_Rafia', etc.
  item_name: string | null;  // 'rongsok', 'sak', 'packing', 'terpal' — SORTIR ONLY
  rate_value: number;
}

// ── Attendance ────────────────────────────────────────────────
export interface AttendanceLog {
  id: string;
  employee_id: string;
  work_date: string;        // ISO date string 'YYYY-MM-DD'
  status: AttendanceStatus;
  overtime_hours: number;
}

// Upsert payload (no id needed)
export interface AttendanceUpsert {
  employee_id: string;
  work_date: string;
  status: AttendanceStatus;
  overtime_hours: number;
}

// ── Production ────────────────────────────────────────────────
export interface ProductionLog {
  id: string;
  employee_id: string;
  work_date: string;
  category: ProductionCategory;
  item_type: SortirItemType | null;   // Only for Sortir category
  quantity: number;
  rate_snapshot: number;              // Rate locked at entry time
}

export interface ProductionUpsert {
  employee_id: string;
  work_date: string;
  category: ProductionCategory;
  item_type: SortirItemType | null;
  quantity: number;
  rate_snapshot: number;
}

// ── Derived / UI Types ────────────────────────────────────────

/** One employee's computed payroll for a Friday–Thursday period */
export interface EmployeePayrollSummary {
  employee: Employee;
  days_present: number;
  total_ot_hours: number;
  daily_pay: number;         // (days_present × base_daily_rate) + (total_ot_hours × ot_rate)
  borongan_pay: number;      // SUM(qty × rate_snapshot) from production_logs
  total_pay: number;         // daily_pay + borongan_pay
}

/** Sembako result for one division */
export interface SembakoResult {
  division: string;
  total_pool: number;
  active_workers: number;
  incentive_per_person: number;
}

/** A Fri–Thu payroll week */
export interface PayrollWeek {
  friday: Date;    // Start of week (Friday)
  thursday: Date;  // End of week (Thursday)
  label: string;   // e.g. "21 Feb – 27 Feb 2026"
}

// ── Constants ─────────────────────────────────────────────────
export const SORTIR_ITEM_TYPES: SortirItemType[] = ['rongsok', 'sak', 'packing', 'terpal'];
export const PRODUCTION_CATEGORIES: ProductionCategory[] = ['Rafia', 'Peletan', 'Sortir', 'Oplosan'];
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Hadir', 'Izin', 'Alpha'];

// ── Division (Dynamic from Supabase) ──────────────────────────
export interface Division {
  id: string;
  name: string;
  is_active: boolean;
}

// Fallback static list (used only if DB not connected)
export const DIVISIONS_FALLBACK = [
  'Supir', 'Mandor', 'Rafia', 'Sortir', 'Peletan', 'Oplosan', 'Administrasi', 'Kebersihan',
];
