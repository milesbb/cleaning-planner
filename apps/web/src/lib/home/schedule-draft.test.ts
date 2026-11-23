import type { Schedule } from '@cleaning-planner/schedule/types';
import { describe, expect, it } from 'vitest';
import { draftFrom, scheduleFrom } from './schedule-draft';
import type { ScheduleDraft } from './schedule-draft';

const WEEKLY: Schedule = { type: 'floating', every: { value: 1, unit: 'week' } };

describe('draftFrom', () => {
  it('starts from a repeat after it is done, with sensible fixed-day defaults', () => {
    expect(draftFrom(WEEKLY)).toEqual({
      kind: 'afterDone',
      every: { value: 1, unit: 'week' },
      weekdays: ['monday'],
      monthDay: 1,
    });
  });

  it('starts from set weekdays', () => {
    const schedule: Schedule = {
      type: 'fixed',
      on: { kind: 'weekdays', weekdays: ['monday', 'thursday'] },
    };
    expect(draftFrom(schedule)).toMatchObject({
      kind: 'weekdays',
      weekdays: ['monday', 'thursday'],
      every: { value: 1, unit: 'week' },
    });
  });

  it('starts from a set day of the month', () => {
    const schedule: Schedule = { type: 'fixed', on: { kind: 'monthDay', day: 'last' } };
    expect(draftFrom(schedule)).toMatchObject({ kind: 'monthDay', monthDay: 'last' });
  });
});

describe('scheduleFrom', () => {
  const draft: ScheduleDraft = {
    kind: 'afterDone',
    every: { value: 3, unit: 'month' },
    weekdays: ['tuesday'],
    monthDay: 15,
  };

  it.each<[ScheduleDraft['kind'], Schedule]>([
    ['afterDone', { type: 'floating', every: { value: 3, unit: 'month' } }],
    ['weekdays', { type: 'fixed', on: { kind: 'weekdays', weekdays: ['tuesday'] } }],
    ['monthDay', { type: 'fixed', on: { kind: 'monthDay', day: 15 } }],
  ])('makes a %s schedule from only the choices that apply', (kind, schedule) => {
    expect(scheduleFrom({ ...draft, kind })).toEqual(schedule);
  });

  it('gives back the schedule it started from', () => {
    expect(scheduleFrom(draftFrom(WEEKLY))).toEqual(WEEKLY);
  });
});
