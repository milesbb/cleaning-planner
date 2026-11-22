import { describe, expect, it } from 'vitest';
import { type CalendarDate, parseCalendarDate } from './calendar-date';
import { type FirstDueDate, type SpreadJob, spreadFirstDueDates } from './spread';
import type { IntervalUnit, Schedule } from './types';

const monday = parseCalendarDate('2026-11-23');

function every(value: number, unit: IntervalUnit): Schedule {
  return { type: 'floating', every: { value, unit } };
}

function jobs(count: number, schedule: Schedule, prefix = 'job'): SpreadJob[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${String(index).padStart(2, '0')}`,
    schedule,
  }));
}

function loadPerDay(firstDueDates: FirstDueDate[]): Map<CalendarDate, number> {
  const load = new Map<CalendarDate, number>();
  firstDueDates.forEach(({ startDate }) => load.set(startDate, (load.get(startDate) ?? 0) + 1));
  return load;
}

function busiestDay(firstDueDates: FirstDueDate[]): number {
  return Math.max(...loadPerDay(firstDueDates).values());
}

function daysFromStart(firstDueDates: FirstDueDate[]): number[] {
  return firstDueDates.map(({ startDate }) =>
    Math.round((Date.parse(startDate) - Date.parse(monday)) / 86_400_000),
  );
}

describe('spreadFirstDueDates', () => {
  it('starts a daily job straight away', () => {
    expect(spreadFirstDueDates([{ id: 'dishes', schedule: every(1, 'day') }], monday)).toEqual([
      { jobId: 'dishes', startDate: '2026-11-23' },
    ]);
  });

  it('starts a lone job on the setup day, since quiet days tie and the earliest wins', () => {
    expect(spreadFirstDueDates(jobs(1, every(1, 'month')), monday)).toEqual([
      { jobId: 'job-00', startDate: '2026-11-23' },
    ]);
  });

  it('puts seven weekly jobs on seven different days in the first week', () => {
    const firstDueDates = spreadFirstDueDates(jobs(7, every(1, 'week')), monday);
    expect(busiestDay(firstDueDates)).toBe(1);
    expect(Math.max(...daysFromStart(firstDueDates))).toBe(6);
  });

  it('never puts more than its fair share on one day', () => {
    const firstDueDates = spreadFirstDueDates(jobs(20, every(1, 'week')), monday);
    expect(busiestDay(firstDueDates)).toBe(Math.ceil(20 / 7));
  });

  it('spreads nine monthly jobs over different days', () => {
    expect(busiestDay(spreadFirstDueDates(jobs(9, every(1, 'month')), monday))).toBe(1);
  });

  it('starts every job within its first interval, and within four weeks at most', () => {
    const mixed = [
      ...jobs(3, every(2, 'day'), 'two-day'),
      ...jobs(4, every(2, 'week'), 'fortnight'),
      ...jobs(5, every(3, 'month'), 'quarter'),
    ];
    const firstDueDates = spreadFirstDueDates(mixed, monday);
    const offsets = daysFromStart(firstDueDates);
    expect(offsets.slice(0, 3).every((offset) => offset < 2)).toBe(true);
    expect(offsets.slice(3, 7).every((offset) => offset < 14)).toBe(true);
    expect(offsets.every((offset) => offset >= 0 && offset < 28)).toBe(true);
  });

  it('works round fixed jobs, which keep their own days', () => {
    const binsOnMonday: SpreadJob = {
      id: 'bins',
      schedule: { type: 'fixed', on: { kind: 'weekdays', weekdays: ['monday'] } },
    };
    const firstDueDates = spreadFirstDueDates([binsOnMonday, ...jobs(6, every(1, 'week'))], monday);
    expect(firstDueDates[0]).toEqual({ jobId: 'bins', startDate: '2026-11-23' });
    expect(firstDueDates.slice(1).map(({ startDate }) => startDate)).not.toContain('2026-11-23');
  });

  it('gives fixed jobs the setup day as their start, so the rule picks the day', () => {
    const onTheFirst: SpreadJob = {
      id: 'smoke-alarm',
      schedule: { type: 'fixed', on: { kind: 'monthDay', day: 1 } },
    };
    expect(spreadFirstDueDates([onTheFirst], monday)).toEqual([
      { jobId: 'smoke-alarm', startDate: '2026-11-23' },
    ]);
  });

  it('returns the jobs in the order they were given', () => {
    const given = [...jobs(2, every(1, 'month'), 'monthly'), ...jobs(2, every(1, 'day'), 'daily')];
    expect(spreadFirstDueDates(given, monday).map(({ jobId }) => jobId)).toEqual(
      given.map(({ id }) => id),
    );
  });

  it('gives the same plan however the jobs are ordered', () => {
    const given = [
      ...jobs(5, every(1, 'week'), 'weekly'),
      ...jobs(5, every(1, 'month'), 'monthly'),
    ];
    const plan = (input: SpreadJob[]): Record<string, string> =>
      Object.fromEntries(
        spreadFirstDueDates(input, monday).map(({ jobId, startDate }) => [jobId, startDate]),
      );
    expect(plan([...given].reverse())).toEqual(plan(given));
  });
});
