import { describe, expect, it } from 'vitest';
import { parseCalendarDate } from './calendar-date';
import { classifyDue, type DueStatus, lastDayOfWeek } from './due-status';
import type { Weekday } from './types';

type DueCase = [description: string, dueText: string, todayText: string, expected: DueStatus];

const mondayWeekCases: DueCase[] = [
  ['yesterday as late', '2026-11-24', '2026-11-25', 'late'],
  ['last month as late', '2026-10-31', '2026-11-25', 'late'],
  ['today', '2026-11-25', '2026-11-25', 'today'],
  ['tomorrow', '2026-11-26', '2026-11-25', 'tomorrow'],
  ['the day after tomorrow as this week', '2026-11-27', '2026-11-25', 'thisWeek'],
  ['Sunday as this week when weeks start on Monday', '2026-11-29', '2026-11-25', 'thisWeek'],
  ['next Monday as later', '2026-11-30', '2026-11-25', 'later'],
  ['tomorrow even when it is in next week', '2026-11-30', '2026-11-29', 'tomorrow'],
  [
    'the day after tomorrow as later on the last day of the week',
    '2026-12-01',
    '2026-11-29',
    'later',
  ],
  ['next year as later', '2027-01-05', '2026-12-30', 'later'],
  ['across the new year as tomorrow', '2027-01-01', '2026-12-31', 'tomorrow'],
];

describe('classifyDue with weeks starting on Monday', () => {
  it.each(mondayWeekCases)('classifies %s', (_, dueText, todayText, expected) => {
    expect(classifyDue(parseCalendarDate(dueText), parseCalendarDate(todayText), 'monday')).toBe(
      expected,
    );
  });
});

describe('classifyDue with weeks starting on Sunday', () => {
  it('treats Saturday as this week and Sunday as later', () => {
    const wednesday = parseCalendarDate('2026-11-25');
    expect(classifyDue(parseCalendarDate('2026-11-28'), wednesday, 'sunday')).toBe('thisWeek');
    expect(classifyDue(parseCalendarDate('2026-11-29'), wednesday, 'sunday')).toBe('later');
  });
});

type WeekEndCase = [todayText: string, weekStartsOn: Weekday, expected: string];

const weekEndCases: WeekEndCase[] = [
  ['2026-11-23', 'monday', '2026-11-29'],
  ['2026-11-29', 'monday', '2026-11-29'],
  ['2026-11-25', 'sunday', '2026-11-28'],
  ['2026-11-29', 'sunday', '2026-12-05'],
  ['2026-12-30', 'monday', '2027-01-03'],
  ['2026-11-25', 'saturday', '2026-11-27'],
];

describe('lastDayOfWeek', () => {
  it.each(weekEndCases)(
    'ends the week of %s (starting %s) on %s',
    (todayText, weekStartsOn, expected) => {
      expect(lastDayOfWeek(parseCalendarDate(todayText), weekStartsOn)).toBe(expected);
    },
  );
});
