import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { formatLongDate } from './format-date';

describe('formatLongDate', () => {
  it.each([
    ['2026-12-01', '1 December 2026'],
    ['2027-02-28', '28 February 2027'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatLongDate(parseCalendarDate(input))).toBe(expected);
  });
});
