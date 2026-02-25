# 📑 SYSTEM REQUIREMENT DOCUMENT: PT ULU PLASTIK PAYROLL & PRODUCTION

## 1. PROJECT IDENTITY
- **Name:** Integrated Payroll & Production System (IPPL)
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & Shadcn/UI
- **Database/Auth:** Supabase
- **Icons:** Lucide-React
- **Goal:** Migration of a complex Excel payroll system into a professional WebApp.

## 2. STRICT BUSINESS LOGIC (GOLDEN RULES)
- **Payroll Cycle:** Weekly, starting **FRIDAY** and ending on **THURSDAY**. Payday is Friday.
- **Working Days:** Monday to Friday. **SATURDAY IS OFF** (System must block/disable inputs on Saturdays).
- **Employee Types:**
  1. **Daily (Harian):** Based on attendance + hourly overtime.
  2. **Piece-Rate (Borongan):** Based on production results (Kg/Unit).
- **Sortir Categories:** Specific for 'Sortir' division, inputs must select from: **[rongsok, sak, packing, terpal]**. Each has a different rate.
- **Sembako Incentive:** Calculated monthly based on a "Pool Sharing" logic.

## 3. DATABASE SCHEMA (SUPABASE SQL)
AI must implement this structure to maintain data integrity:

```sql
-- 1. Master Employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  division TEXT NOT NULL, -- 'Supir', 'Mandor', 'Rafia', 'Sortir', etc.
  worker_type TEXT NOT NULL, -- 'Daily' or 'Piece-rate'
  base_daily_rate NUMERIC DEFAULT 0,
  overtime_rate_per_hour NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- 2. Rates Configuration (Including Sortir & Sembako)
CREATE TABLE rates_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL, -- 'Sortir', 'Rafia', 'Sembako_Rafia', etc.
  item_name TEXT, -- 'rongsok', 'sak', 'packing', 'terpal' for Sortir
  rate_value NUMERIC NOT NULL
);

-- 3. Attendance Logs (Friday-Thursday Cycle)
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  work_date DATE NOT NULL,
  status TEXT DEFAULT 'Hadir', -- 'Hadir', 'Izin', 'Alpha'
  overtime_hours NUMERIC DEFAULT 0,
  UNIQUE(employee_id, work_date)
);

-- 4. Production Logs (For Borongan Divisions)
CREATE TABLE production_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  work_date DATE NOT NULL,
  category TEXT NOT NULL, -- 'Rafia', 'Peletan', 'Sortir', 'Oplosan'
  item_type TEXT, -- 'rongsok', 'sak', 'packing', 'terpal' (FOR SORTIR ONLY)
  quantity NUMERIC NOT NULL,
  rate_snapshot NUMERIC NOT NULL -- Capture rate at entry time to prevent changes later
);
4. APPLICATION MODULES & FUNCTIONALITY
MODULE A: MASTER DATA (MANAGEMENT)
Employee CRUD: Manage name, division, and salary base.

Rates Management: A table to set rates for daily work, overtime, and piece-rate categories (including the 4 Sortir types).

MODULE B: ATTENDANCE GRID (REPLICATING 'ABSENSI' SHEET)
UI: A table showing employees by division for the current Friday-Thursday period.

Logic: Validate that no data is entered for Saturdays.

Calculation: Daily_Pay = (Days_Present * base_daily_rate) + (Total_OT_Hours * overtime_rate_per_hour).

MODULE C: PRODUCTION INPUT (BORONGAN)
General Borongan: Input Quantity (Kg/Unit) for Rafia, Peletan, and Oplosan.

Sortir Specific Form: Must include a toggle/select for: [rongsok, sak, packing, terpal].

Calculation: Borongan_Pay = Qty * Rate_of_Type.

MODULE D: SEMBAKO CALCULATOR (MONTHLY)
Logic: 1. Sum ALL production for a division in a month.
2. Multiply by Sembako Rate for that division = Total_Pool.
3. Divide Total_Pool by the count of active workers in that division = Incentive_per_Person.

MODULE E: PAYROLL SUMMARY & PRINTING (REPLICATING 'PRINT SLIP' & 'TANDA TERIMA')
Payroll Review: A view to see all calculated totals before finalizing.

Tanda Terima Layout: - Printer-friendly format using @media print.

Layout: Exactly 3 receipt slips per A4 page to replicate the Excel physical format.

Content: Name, Division, Date, Breakdown of earnings, and Signature Line.

5. DEVELOPMENT ROADMAP
Phase 1: Setup Next.js, Supabase connection, and the SQL schema above.

Phase 2: Build Employee and Rates Management pages.

Phase 3: Develop the Attendance Grid with Friday-Thursday logic and Saturday-OFF validation.

Phase 4: Build the Production Input module with Sortir category support.

Phase 5: Implement the Payroll engine and the 3-slips-per-page Print Module.

AI AGENT INSTRUCTION: Please confirm you understand the Friday-Thursday cycle and the 4-category Sortir logic before writing any code. Start by providing the TypeScript Interfaces for this project.