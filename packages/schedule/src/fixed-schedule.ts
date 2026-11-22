import {
  addInterval,
  type CalendarDate,
  daysUntilWeekday,
  lastDayOfMonth,
  weekdayNumberOf,
  withDayOfMonth,
} from './calendar-date';
import type { FixedRule, Interval, MonthDayRule, WeekdaysRule } from './types';

const FIRST_DAY_OF_MONTH = 1;
const LAST_POSSIBLE_DAY_OF_MONTH = 31;
const ONE_MONTH: Interval = { value: 1, unit: 'month' };

function firstMatchingWeekday(rule: WeekdaysRule, from: CalendarDate): CalendarDate {
  if (rule.weekdays.length === 0) throw new Error('A weekly rule needs at least one weekday');
  const fromWeekdayNumber = weekdayNumberOf(from);
  const daysUntilEachWeekday = rule.weekdays.map((weekday) =>
    daysUntilWeekday(fromWeekdayNumber, weekday),
  );
  return addInterval(from, { value: Math.min(...daysUntilEachWeekday), unit: 'day' });
}

function isValidDayOfMonth(day: number | 'last'): boolean {
  if (day === 'last') return true;
  return Number.isInteger(day) && day >= FIRST_DAY_OF_MONTH && day <= LAST_POSSIBLE_DAY_OF_MONTH;
}

function occurrenceInMonthOf(rule: MonthDayRule, date: CalendarDate): CalendarDate {
  const requestedDay = rule.day === 'last' ? lastDayOfMonth(date) : rule.day;
  return withDayOfMonth(date, requestedDay);
}

function firstMatchingMonthDay(rule: MonthDayRule, from: CalendarDate): CalendarDate {
  if (!isValidDayOfMonth(rule.day)) {
    throw new Error(
      `Day of month must be a whole number from 1 to 31 or "last", got ${String(rule.day)}`,
    );
  }
  const occurrenceThisMonth = occurrenceInMonthOf(rule, from);
  if (occurrenceThisMonth >= from) return occurrenceThisMonth;
  const startOfNextMonth = addInterval(withDayOfMonth(from, FIRST_DAY_OF_MONTH), ONE_MONTH);
  return occurrenceInMonthOf(rule, startOfNextMonth);
}

export function firstFixedOccurrence(rule: FixedRule, from: CalendarDate): CalendarDate {
  return rule.kind === 'weekdays'
    ? firstMatchingWeekday(rule, from)
    : firstMatchingMonthDay(rule, from);
}
