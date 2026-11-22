import { describe, expect, it } from 'vitest';
import { parseCalendarDate } from './calendar-date';
import { nextDueDate } from './next-due';
import type { FixedSchedule, FloatingSchedule } from './types';

const fortnightlySchedule: FloatingSchedule = {
  type: 'floating',
  every: { value: 2, unit: 'week' },
};
const monthlySchedule: FloatingSchedule = { type: 'floating', every: { value: 1, unit: 'month' } };
const binsOnMonday: FixedSchedule = {
  type: 'fixed',
  on: { kind: 'weekdays', weekdays: ['monday'] },
};
const onTheFirst: FixedSchedule = { type: 'fixed', on: { kind: 'monthDay', day: 1 } };

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

describe('nextDueDate (snoozed)', () => {
  const neverDone = { startDate: parseCalendarDate('2026-11-22'), lastDoneOn: null };
  const snoozeToTuesday = {
    from: parseCalendarDate('2026-11-22'),
    until: parseCalendarDate('2026-11-24'),
  };

  it('is the snooze date while the snooze applies', () => {
    expect(nextDueDate(fortnightlySchedule, { ...neverDone, snooze: snoozeToTuesday })).toBe(
      '2026-11-24',
    );
  });

  it('ends the snooze once the job is done, so the schedule takes over again', () => {
    expect(
      nextDueDate(fortnightlySchedule, {
        ...neverDone,
        lastDoneOn: parseCalendarDate('2026-11-23'),
        snooze: snoozeToTuesday,
      }),
    ).toBe('2026-12-07');
  });

  it('works for fixed schedules', () => {
    const snoozeFromMonday = {
      from: parseCalendarDate('2026-11-23'),
      until: parseCalendarDate('2026-11-25'),
    };
    expect(
      nextDueDate(binsOnMonday, {
        startDate: parseCalendarDate('2026-11-01'),
        lastDoneOn: parseCalendarDate('2026-11-16'),
        snooze: snoozeFromMonday,
      }),
    ).toBe('2026-11-25');
  });
});

describe('nextDueDate (fixed)', () => {
  it('is the first matching day on or after the start date when never completed', () => {
    expect(
      nextDueDate(binsOnMonday, { startDate: parseCalendarDate('2026-11-25'), lastDoneOn: null }),
    ).toBe('2026-11-30');
    expect(
      nextDueDate(binsOnMonday, { startDate: parseCalendarDate('2026-11-23'), lastDoneOn: null }),
    ).toBe('2026-11-23');
  });

  it('is the first matching day after the last completion', () => {
    expect(
      nextDueDate(binsOnMonday, {
        startDate: parseCalendarDate('2026-11-01'),
        lastDoneOn: parseCalendarDate('2026-11-23'),
      }),
    ).toBe('2026-11-30');
  });

  it('stays on its fixed days when done late', () => {
    expect(
      nextDueDate(binsOnMonday, {
        startDate: parseCalendarDate('2026-11-01'),
        lastDoneOn: parseCalendarDate('2026-11-25'),
      }),
    ).toBe('2026-11-30');
  });

  it('works for a day of the month across a year boundary', () => {
    expect(
      nextDueDate(onTheFirst, {
        startDate: parseCalendarDate('2026-01-01'),
        lastDoneOn: parseCalendarDate('2026-12-01'),
      }),
    ).toBe('2027-01-01');
  });
});
