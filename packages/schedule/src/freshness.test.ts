import { describe, expect, it } from 'vitest';
import { parseCalendarDate } from './calendar-date';
import { freshness } from './freshness';
import type { CompletionHistory } from './next-due';
import type { FixedSchedule, FloatingSchedule } from './types';

const weekly: FloatingSchedule = { type: 'floating', every: { value: 1, unit: 'week' } };
const monthly: FloatingSchedule = { type: 'floating', every: { value: 1, unit: 'month' } };
const everyTenDays: FloatingSchedule = { type: 'floating', every: { value: 10, unit: 'day' } };
const binsOnMonday: FixedSchedule = {
  type: 'fixed',
  on: { kind: 'weekdays', weekdays: ['monday'] },
};
const onTheLast: FixedSchedule = { type: 'fixed', on: { kind: 'monthDay', day: 'last' } };

function doneOn(lastDoneOn: string, startDate = '2026-01-01'): CompletionHistory {
  return { startDate: parseCalendarDate(startDate), lastDoneOn: parseCalendarDate(lastDoneOn) };
}

function freshnessOn(
  today: string,
  history: CompletionHistory,
  schedule: FloatingSchedule | FixedSchedule = everyTenDays,
): number | null {
  return freshness(schedule, history, parseCalendarDate(today));
}

describe('freshness', () => {
  it.each([
    ['2026-11-10', 1],
    ['2026-11-11', 0.9],
    ['2026-11-15', 0.5],
    ['2026-11-19', 0.1],
    ['2026-11-20', 0],
  ])('falls evenly from 1 when done to 0 when due (%s)', (today, expected) => {
    expect(freshnessOn(today, doneOn('2026-11-10'))).toBeCloseTo(expected);
  });

  it.each(['2026-11-21', '2026-12-31'])('never goes below 0 once late (%s)', (today) => {
    expect(freshnessOn(today, doneOn('2026-11-10'))).toBe(0);
  });

  it('never goes above 1, even before the day it was done', () => {
    expect(freshnessOn('2026-11-09', doneOn('2026-11-10'))).toBe(1);
  });

  it('counts a job that was never done as falling due on its start date', () => {
    const neverDone: CompletionHistory = {
      startDate: parseCalendarDate('2026-11-20'),
      lastDoneOn: null,
    };
    expect(freshnessOn('2026-11-15', neverDone)).toBeCloseTo(0.5);
    expect(freshnessOn('2026-11-20', neverDone)).toBe(0);
    expect(freshnessOn('2026-11-25', neverDone)).toBe(0);
  });

  it('runs down to a snoozed due date instead of the usual one', () => {
    const snoozed: CompletionHistory = {
      ...doneOn('2026-11-10'),
      snooze: { from: parseCalendarDate('2026-11-20'), until: parseCalendarDate('2026-11-30') },
    };
    expect(freshnessOn('2026-11-20', snoozed)).toBeCloseTo(0.5);
    expect(freshnessOn('2026-11-30', snoozed)).toBe(0);
  });

  it('is empty when a snooze makes it due on the day it was done', () => {
    const snoozedToToday: CompletionHistory = {
      ...doneOn('2026-11-10'),
      snooze: { from: parseCalendarDate('2026-11-20'), until: parseCalendarDate('2026-11-10') },
    };
    expect(freshnessOn('2026-11-10', snoozedToToday)).toBe(0);
  });

  it.each([
    {
      edge: 'the end of a year',
      schedule: weekly,
      done: '2026-12-28',
      today: '2027-01-01',
      left: 3 / 7,
    },
    {
      edge: '31 January in a leap year',
      schedule: monthly,
      done: '2028-01-31',
      today: '2028-02-15',
      left: 14 / 29,
    },
    {
      edge: '31 January in another year',
      schedule: monthly,
      done: '2027-01-31',
      today: '2027-02-14',
      left: 14 / 28,
    },
    {
      edge: 'a 30-day month',
      schedule: monthly,
      done: '2026-04-30',
      today: '2026-05-15',
      left: 15 / 30,
    },
    {
      edge: 'the spring clock change',
      schedule: weekly,
      done: '2026-03-26',
      today: '2026-03-30',
      left: 3 / 7,
    },
    {
      edge: 'the autumn clock change',
      schedule: weekly,
      done: '2026-10-22',
      today: '2026-10-26',
      left: 3 / 7,
    },
  ])('counts whole days across $edge', ({ schedule, done, today, left }) => {
    expect(freshnessOn(today, doneOn(done), schedule)).toBeCloseTo(left);
  });

  it.each([
    ['weekdays', binsOnMonday],
    ['a day of the month', onTheLast],
  ])('has no freshness for jobs on set %s', (_case, schedule) => {
    expect(freshnessOn('2026-11-24', doneOn('2026-11-23'), schedule)).toBeNull();
  });
});
