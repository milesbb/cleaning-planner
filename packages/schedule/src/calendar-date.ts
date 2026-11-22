import type { Interval } from './types';

declare const calendarDateBrand: unique symbol;

export type CalendarDate = string & { readonly [calendarDateBrand]: true };

interface DateParts {
  year: number;
  monthIndex: number;
  day: number;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAYS_PER_WEEK = 7;

function toParts(value: string): DateParts {
  return {
    year: Number(value.slice(0, 4)),
    monthIndex: Number(value.slice(5, 7)) - 1,
    day: Number(value.slice(8, 10)),
  };
}

function formatUtc(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function isCalendarDate(value: string): value is CalendarDate {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const { year, monthIndex, day } = toParts(value);
  return formatUtc(Date.UTC(year, monthIndex, day)) === value;
}

export function parseCalendarDate(value: string): CalendarDate {
  if (isCalendarDate(value)) return value;
  throw new Error(`Invalid calendar date: ${value}`);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addMonths({ year, monthIndex, day }: DateParts, months: number): number {
  const targetMonthIndex = monthIndex + months;
  const clampedDay = Math.min(day, daysInMonth(year, targetMonthIndex));
  return Date.UTC(year, targetMonthIndex, clampedDay);
}

function addDays({ year, monthIndex, day }: DateParts, days: number): number {
  return Date.UTC(year, monthIndex, day + days);
}

export function addInterval(date: CalendarDate, interval: Interval): CalendarDate {
  const parts = toParts(date);
  const timestamp =
    interval.unit === 'month'
      ? addMonths(parts, interval.value)
      : addDays(parts, interval.unit === 'week' ? interval.value * DAYS_PER_WEEK : interval.value);
  return parseCalendarDate(formatUtc(timestamp));
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
