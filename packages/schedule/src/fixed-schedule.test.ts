import { describe, expect, it } from 'vitest';
import { parseCalendarDate } from './calendar-date';
import { firstFixedOccurrence } from './fixed-schedule';
import type { FixedRule, Weekday } from './types';

function onWeekdays(...weekdays: Weekday[]): FixedRule {
  return { kind: 'weekdays', weekdays };
}

function onMonthDay(day: number | 'last'): FixedRule {
  return { kind: 'monthDay', day };
}

describe('firstFixedOccurrence on weekdays', () => {
  it.each([
    ['the same day when it matches', onWeekdays('monday'), '2026-11-23', '2026-11-23'],
    ['the next matching day later in the week', onWeekdays('thursday'), '2026-11-23', '2026-11-26'],
    ['wraps into the next week', onWeekdays('monday'), '2026-11-24', '2026-11-30'],
    ['a Sunday', onWeekdays('sunday'), '2026-11-23', '2026-11-29'],
    ['a Saturday', onWeekdays('saturday'), '2026-11-23', '2026-11-28'],
    ['the earliest of several days', onWeekdays('thursday', 'tuesday'), '2026-11-23', '2026-11-24'],
    ['across a year boundary', onWeekdays('friday'), '2026-12-30', '2027-01-01'],
    ['across a DST weekend', onWeekdays('monday'), '2026-03-28', '2026-03-30'],
  ])('finds %s', (_, rule, fromText, expected) => {
    expect(firstFixedOccurrence(rule, parseCalendarDate(fromText))).toBe(expected);
  });

  it('rejects a rule with no weekdays', () => {
    expect(() => firstFixedOccurrence(onWeekdays(), parseCalendarDate('2026-11-23'))).toThrow(
      'A weekly rule needs at least one weekday',
    );
  });
});

type MonthDayCase = [description: string, day: number | 'last', from: string, expected: string];

const monthDayCases: MonthDayCase[] = [
  ['later this month', 15, '2026-11-02', '2026-11-15'],
  ['the same day when it matches', 15, '2026-11-15', '2026-11-15'],
  ['next month when this month has passed', 15, '2026-11-16', '2026-12-15'],
  ['next year from December', 1, '2026-12-02', '2027-01-01'],
  ['the 31st clamped to the end of February', 31, '2026-02-10', '2026-02-28'],
  ['the 29th of February in a leap year', 31, '2028-02-10', '2028-02-29'],
  ['the 30th clamped to February', 30, '2026-02-01', '2026-02-28'],
  ['the 31st in a long month', 31, '2026-03-01', '2026-03-31'],
  ['the 31st clamped to the 30th of April when already on it', 31, '2026-04-30', '2026-04-30'],
  ['a clamped day next month once this month has passed', 30, '2026-01-31', '2026-02-28'],
  ['the last day', 'last', '2026-11-02', '2026-11-30'],
  ['the last day of February', 'last', '2026-02-02', '2026-02-28'],
  ['the last day when already on it', 'last', '2026-11-30', '2026-11-30'],
];

describe('firstFixedOccurrence on a day of the month', () => {
  it.each(monthDayCases)('finds %s', (_, day, fromText, expected) => {
    expect(firstFixedOccurrence(onMonthDay(day), parseCalendarDate(fromText))).toBe(expected);
  });

  it.each([0, 32, 1.5, -1])('rejects day %s', (day) => {
    expect(() => firstFixedOccurrence(onMonthDay(day), parseCalendarDate('2026-11-23'))).toThrow(
      `Day of month must be a whole number from 1 to 31 or "last", got ${String(day)}`,
    );
  });
});
