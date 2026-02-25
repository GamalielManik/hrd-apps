import {
    startOfWeek,
    endOfWeek,
    addWeeks,
    subWeeks,
    format,
    isSaturday,
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
    // date-fns startOfWeek with weekStartsOn:5 (Friday)
    return startOfWeek(date, { weekStartsOn: 5 });
}

export function getPayrollWeekEnd(friday: Date): Date {
    // Thursday = friday + 6 days
    return endOfWeek(friday, { weekStartsOn: 5 });
}

export function getCurrentPayrollWeek(): PayrollWeek {
    const today = new Date();
    const friday = getPayrollWeekStart(today);
    const thursday = getPayrollWeekEnd(friday);
    return {
        friday,
        thursday,
        label: `${format(friday, 'd MMM', { locale: id })} – ${format(thursday, 'd MMM yyyy', { locale: id })}`,
    };
}

export function nextPayrollWeek(week: PayrollWeek): PayrollWeek {
    const friday = addWeeks(week.friday, 1);
    const thursday = getPayrollWeekEnd(friday);
    return {
        friday,
        thursday,
        label: `${format(friday, 'd MMM', { locale: id })} – ${format(thursday, 'd MMM yyyy', { locale: id })}`,
    };
}

export function prevPayrollWeek(week: PayrollWeek): PayrollWeek {
    const friday = subWeeks(week.friday, 1);
    const thursday = getPayrollWeekEnd(friday);
    return {
        friday,
        thursday,
        label: `${format(friday, 'd MMM', { locale: id })} – ${format(thursday, 'd MMM yyyy', { locale: id })}`,
    };
}

/**
 * Returns only Mon–Fri days in the given payroll week (no Saturday).
 */
export function getWorkDays(week: PayrollWeek): Date[] {
    const allDays = eachDayOfInterval({ start: week.friday, end: week.thursday });
    return allDays.filter((d) => !isSaturday(d));
}

/** Returns all 7 days of the week — used for rendering columns (Saturday is shown but disabled). */
export function getAllWeekDays(week: PayrollWeek): Date[] {
    return eachDayOfInterval({ start: week.friday, end: week.thursday });
}

/** Formats a Date to 'YYYY-MM-DD' for Supabase */
export function toISODateString(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

/** Returns Indonesian day name */
export const DAY_NAMES_ID: Record<number, string> = {
    0: 'Min',
    1: 'Sen',
    2: 'Sel',
    3: 'Rab',
    4: 'Kam',
    5: 'Jum',
    6: 'Sab',
};

export { isSaturday, format, getDay };
