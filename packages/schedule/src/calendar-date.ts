import type { Interval, Weekday } from './types';

declare const calendarDateBrand: unique symbol;

export type CalendarDate = string & { readonly [calendarDateBrand]: true };

interface DateParts {
  year: number;
  monthIndex: number;
  day: number;
}

export const DAYS_PER_WEEK = 7;
const CALENDAR_DATE_LENGTH = 'YYYY-MM-DD'.length;
const MILLISECONDS_PER_DAY = 86_400_000;
const LAST_DAY_OF_PREVIOUS_MONTH = 0;

function toDateParts(value: string): DateParts {
  const [yearText, monthText, dayText] = value.split('-');
  return {
    year: Number(yearText),
    monthIndex: Number(monthText) - 1,
    day: Number(dayText),
  };
}

function timestampToCalendarText(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, CALENDAR_DATE_LENGTH);
}

export function isCalendarDate(value: string): value is CalendarDate {
  const { year, monthIndex, day } = toDateParts(value);
  const timestamp = Date.UTC(year, monthIndex, day);
  return !Number.isNaN(timestamp) && timestampToCalendarText(timestamp) === value;
}

export function parseCalendarDate(value: string): CalendarDate {
  if (isCalendarDate(value)) return value;
  throw new Error(`Invalid calendar date: ${value}`);
}

function daysInMonth(year: number, monthIndex: number): number {
  const lastDayOfMonth = new Date(Date.UTC(year, monthIndex + 1, LAST_DAY_OF_PREVIOUS_MONTH));
  return lastDayOfMonth.getUTCDate();
}

function addMonths({ year, monthIndex, day }: DateParts, months: number): number {
  const targetMonthIndex = monthIndex + months;
  const clampedDay = Math.min(day, daysInMonth(year, targetMonthIndex));
  return Date.UTC(year, targetMonthIndex, clampedDay);
}

function addDays({ year, monthIndex, day }: DateParts, days: number): number {
  return Date.UTC(year, monthIndex, day + days);
}

function intervalInDays(interval: Interval): number {
  return interval.unit === 'week' ? interval.value * DAYS_PER_WEEK : interval.value;
}

export function addInterval(date: CalendarDate, interval: Interval): CalendarDate {
  const dateParts = toDateParts(date);
  const timestamp =
    interval.unit === 'month'
      ? addMonths(dateParts, interval.value)
      : addDays(dateParts, intervalInDays(interval));
  return parseCalendarDate(timestampToCalendarText(timestamp));
}

export const WEEKDAYS_FROM_SUNDAY: readonly Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function daysUntilWeekday(fromWeekdayNumber: number, weekday: Weekday): number {
  const targetWeekdayNumber = WEEKDAYS_FROM_SUNDAY.indexOf(weekday);
  return (targetWeekdayNumber - fromWeekdayNumber + DAYS_PER_WEEK) % DAYS_PER_WEEK;
}

export function weekdayNumberOf(date: CalendarDate): number {
  const { year, monthIndex, day } = toDateParts(date);
  return new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
}

export function lastDayOfMonth(date: CalendarDate): number {
  const { year, monthIndex } = toDateParts(date);
  return daysInMonth(year, monthIndex);
}

export function withDayOfMonth(date: CalendarDate, requestedDay: number): CalendarDate {
  const { year, monthIndex } = toDateParts(date);
  const clampedDay = Math.min(requestedDay, daysInMonth(year, monthIndex));
  return parseCalendarDate(timestampToCalendarText(Date.UTC(year, monthIndex, clampedDay)));
}

export function compareDates(first: CalendarDate, second: CalendarDate): number {
  if (first < second) return -1;
  return first > second ? 1 : 0;
}

// Both days are UTC midnights, so a clock change never adds or loses an hour.
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  const start = toDateParts(from);
  const end = toDateParts(to);
  const startTime = Date.UTC(start.year, start.monthIndex, start.day);
  const endTime = Date.UTC(end.year, end.monthIndex, end.day);
  return (endTime - startTime) / MILLISECONDS_PER_DAY;
}
