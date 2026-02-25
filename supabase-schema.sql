-- ============================================================
-- IPPL DATABASE SCHEMA — PT ULU PLASTIK
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Divisions Master (Dynamic — managed from app)
CREATE TABLE IF NOT EXISTS divisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial divisions
INSERT INTO divisions (name) VALUES
  ('Supir'), ('Mandor'), ('Rafia'), ('Sortir'),
  ('Peletan'), ('Oplosan'), ('Administrasi'), ('Kebersihan')
ON CONFLICT (name) DO NOTHING;

-- RLS for divisions
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_divisions" ON divisions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 1. Master Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  division TEXT NOT NULL,
  worker_type TEXT NOT NULL CHECK (worker_type IN ('Daily', 'Piece-rate')),
  base_daily_rate NUMERIC DEFAULT 0,
  overtime_rate_per_hour NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Rates Configuration (Including Sortir & Sembako)
CREATE TABLE IF NOT EXISTS rates_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,       -- 'Sortir', 'Rafia', 'Peletan', 'Oplosan', 'Sembako_Rafia', etc.
  item_name TEXT,               -- 'rongsok', 'sak', 'packing', 'terpal' — SORTIR ONLY
  rate_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Attendance Logs (Friday-Thursday Cycle)
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  status TEXT DEFAULT 'Hadir' CHECK (status IN ('Hadir', 'Izin', 'Alpha')),
  overtime_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, work_date)
);

-- 4. Production Logs (For Borongan Divisions)
CREATE TABLE IF NOT EXISTS production_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Rafia', 'Peletan', 'Sortir', 'Oplosan')),
  item_type TEXT CHECK (item_type IN ('rongsok', 'sak', 'packing', 'terpal')),
  quantity NUMERIC NOT NULL,
  rate_snapshot NUMERIC NOT NULL,  -- Rate locked at time of entry
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_att_emp_date ON attendance_logs(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_prod_emp_date ON production_logs(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_prod_date ON production_logs(work_date);

-- ── Row Level Security ─────────────────────────────────
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates_config ENABLE ROW LEVEL SECURITY;-- ============================================================
-- v2.0 MIGRATION — Run this if upgrading from v1.0
-- ============================================================
ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS hours_worked NUMERIC DEFAULT 9;
-- DEFAULT 9 = full work day. Old records automatically get 9 (full day).

ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (adjust as needed)
CREATE POLICY "allow_all_employees" ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_rates" ON rates_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_attendance" ON attendance_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_production" ON production_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Seed: Sample Sortir Rates ───────────────────────────
-- Uncomment to seed initial rates for testing:
-- INSERT INTO rates_config (category, item_name, rate_value) VALUES
--   ('Sortir', 'rongsok', 150),
--   ('Sortir', 'sak', 200),
--   ('Sortir', 'packing', 250),
--   ('Sortir', 'terpal', 300),
--   ('Rafia', NULL, 500),
--   ('Peletan', NULL, 400),
--   ('Oplosan', NULL, 350),
--   ('Sembako_Rafia', NULL, 2),
--   ('Sembako_Sortir', NULL, 2);
