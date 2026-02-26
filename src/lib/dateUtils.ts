import {
    startOfWeek,
    endOfWeek,
    addWeeks,
    subWeeks,
    format,
    isSaturday,
    isSunday,
    eachDayOfInterval,
    getDay,
} from 'date-fns';
import { id } from 'date-fns/locale';
import type { PayrollWeek } from '@/types';

/**
 * Returns the Friday that starts the payroll week containing `date`.
 * Payroll cycle: Friday → Thursday.
 */
export function getPayrollWeekStart(date: Date): Date {
    return startOfWeek(date, { weekStartsOn: 5 });
}

export function getPayrollWeekEnd(friday: Date): Date {
    return endOfWeek(friday, { weekStartsOn: 5 });
}

function makeWeekLabel(friday: Date, thursday: Date): string {
    return `${format(friday, 'd MMM', { locale: id })} – ${format(thursday, 'd MMM yyyy', { locale: id })}`;
}

export function getCurrentPayrollWeek(): PayrollWeek {
    const today = new Date();
    const friday = getPayrollWeekStart(today);
    const thursday = getPayrollWeekEnd(friday);
    return { friday, thursday, label: makeWeekLabel(friday, thursday) };
}

export function nextPayrollWeek(week: PayrollWeek): PayrollWeek {
    const friday = addWeeks(week.friday, 1);
    const thursday = getPayrollWeekEnd(friday);
    return { friday, thursday, label: makeWeekLabel(friday, thursday) };
}

export function prevPayrollWeek(week: PayrollWeek): PayrollWeek {
    const friday = subWeeks(week.friday, 1);
    const thursday = getPayrollWeekEnd(friday);
    return { friday, thursday, label: makeWeekLabel(friday, thursday) };
}

/**
 * v2.0 — Returns all Fri–Thu payroll weeks that intersect the given month.
 * A week intersects if its Friday <= last day of month AND its Thursday >= first day.
 */
export function getWeeksInMonth(month: number, year: number): PayrollWeek[] {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0); // last day of month

    // Start from the Friday of the week containing the first day of the month
    let friday = getPayrollWeekStart(firstDay);
    const weeks: PayrollWeek[] = [];

    while (friday <= lastDay) {
        const thursday = getPayrollWeekEnd(friday);
        weeks.push({
            friday: new Date(friday),
            thursday: new Date(thursday),
            label: `${format(friday, 'd MMM', { locale: id })} – ${format(thursday, 'd MMM', { locale: id })}`,
        });
        friday = addWeeks(friday, 1);
    }

    return weeks;
}

/** Only Saturday is OFF. Minggu (Sunday) IS a work day. */
export function isWorkDay(date: Date): boolean {
    return !isSaturday(date);
}

/**
 * Returns work days in the payroll week: Fri, Sun, Mon, Tue, Wed, Thu
 * Only Saturday is excluded.
 */
export function getWorkDays(week: PayrollWeek): Date[] {
    return eachDayOfInterval({ start: week.friday, end: week.thursday })
        .filter(isWorkDay);
}

/** Returns all 7 days of the week (for column rendering). */
export function getAllWeekDays(week: PayrollWeek): Date[] {
    return eachDayOfInterval({ start: week.friday, end: week.thursday });
}

/** Formats a Date to 'YYYY-MM-DD' for Supabase */
export function toISODateString(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

/** Indonesian short day names (0=Sun, 1=Mon ... 6=Sat) */
export const DAY_NAMES_ID: Record<number, string> = {
    0: 'Min', 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab',
};

export { isSaturday, isSunday, format, getDay };
