import { describe, expect, it } from 'vitest';
import { parseCalendarDate } from './calendar-date';
import { nextDueDate } from './next-due';
import type { FloatingSchedule } from './types';

const fortnightly: FloatingSchedule = { type: 'floating', every: { value: 2, unit: 'week' } };
const monthly: FloatingSchedule = { type: 'floating', every: { value: 1, unit: 'month' } };

describe('nextDueDate (floating)', () => {
  it('is due on the start date when never completed', () => {
    expect(
      nextDueDate(fortnightly, { startDate: parseCalendarDate('2026-11-22'), lastDoneOn: null }),
    ).toBe('2026-11-22');
  });

  it('is one interval after the last completion', () => {
    expect(
      nextDueDate(fortnightly, {
        startDate: parseCalendarDate('2026-10-01'),
        lastDoneOn: parseCalendarDate('2026-11-20'),
      }),
    ).toBe('2026-12-04');
  });

  it('moves with the completion date, not the original schedule', () => {
    const history = { startDate: parseCalendarDate('2026-01-01') };
    const early = nextDueDate(monthly, { ...history, lastDoneOn: parseCalendarDate('2026-03-10') });
    const late = nextDueDate(monthly, { ...history, lastDoneOn: parseCalendarDate('2026-03-25') });
    expect(early).toBe('2026-04-10');
    expect(late).toBe('2026-04-25');
  });
});
