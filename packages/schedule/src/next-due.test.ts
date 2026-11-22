import { describe, expect, it } from 'vitest';
import { parseCalendarDate } from './calendar-date';
import { nextDueDate } from './next-due';
import type { FloatingSchedule } from './types';

const fortnightlySchedule: FloatingSchedule = {
  type: 'floating',
  every: { value: 2, unit: 'week' },
};
const monthlySchedule: FloatingSchedule = { type: 'floating', every: { value: 1, unit: 'month' } };

describe('nextDueDate (floating)', () => {
  it('is due on the start date when never completed', () => {
    expect(
      nextDueDate(fortnightlySchedule, {
        startDate: parseCalendarDate('2026-11-22'),
        lastDoneOn: null,
      }),
    ).toBe('2026-11-22');
  });

  it('is one interval after the last completion', () => {
    expect(
      nextDueDate(fortnightlySchedule, {
        startDate: parseCalendarDate('2026-10-01'),
        lastDoneOn: parseCalendarDate('2026-11-20'),
      }),
    ).toBe('2026-12-04');
  });

  it('moves with the completion date, not the original schedule', () => {
    const historyWithoutCompletion = { startDate: parseCalendarDate('2026-01-01') };
    const dueAfterEarlyCompletion = nextDueDate(monthlySchedule, {
      ...historyWithoutCompletion,
      lastDoneOn: parseCalendarDate('2026-03-10'),
    });
    const dueAfterLateCompletion = nextDueDate(monthlySchedule, {
      ...historyWithoutCompletion,
      lastDoneOn: parseCalendarDate('2026-03-25'),
    });
    expect(dueAfterEarlyCompletion).toBe('2026-04-10');
    expect(dueAfterLateCompletion).toBe('2026-04-25');
  });
});
