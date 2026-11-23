import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { formatDayHeading, formatLongDate, formatShortDate } from './format-date';

describe('formatLongDate', () => {
  it.each([
    ['2026-12-01', '1 December 2026'],
    ['2027-02-28', '28 February 2027'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatLongDate(parseCalendarDate(input))).toBe(expected);
  });
});

describe('formatDayHeading', () => {
  it.each([
    ['2026-11-24', 'Tuesday 24 November'],
    ['2027-01-01', 'Friday 1 January'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatDayHeading(parseCalendarDate(input))).toBe(expected);
  });
});

describe('formatShortDate', () => {
  it('gives the day and month', () => {
    expect(formatShortDate(parseCalendarDate('2026-12-14'))).toBe('14 December');
  });
});
