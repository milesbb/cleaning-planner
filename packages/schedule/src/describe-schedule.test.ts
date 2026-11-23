import { describe, expect, it } from 'vitest';
import { describeSchedule } from './describe-schedule';
import type { Schedule } from './types';

describe('describeSchedule', () => {
  it.each<[string, Schedule, string]>([
    ['weekly', { type: 'floating', every: { value: 1, unit: 'week' } }, 'Weekly'],
    ['fortnightly', { type: 'floating', every: { value: 2, unit: 'week' } }, 'Fortnightly'],
    ['every 3 months', { type: 'floating', every: { value: 3, unit: 'month' } }, 'Every 3 months'],
    [
      'one weekday',
      { type: 'fixed', on: { kind: 'weekdays', weekdays: ['monday'] } },
      'Every Monday',
    ],
    [
      'two weekdays',
      { type: 'fixed', on: { kind: 'weekdays', weekdays: ['thursday', 'monday'] } },
      'Every Monday and Thursday',
    ],
    [
      'three weekdays',
      { type: 'fixed', on: { kind: 'weekdays', weekdays: ['friday', 'monday', 'wednesday'] } },
      'Every Monday, Wednesday and Friday',
    ],
    [
      'a day of the month',
      { type: 'fixed', on: { kind: 'monthDay', day: 1 } },
      'Monthly on the 1st',
    ],
    ['the 2nd', { type: 'fixed', on: { kind: 'monthDay', day: 2 } }, 'Monthly on the 2nd'],
    ['the 3rd', { type: 'fixed', on: { kind: 'monthDay', day: 23 } }, 'Monthly on the 23rd'],
    ['the 11th', { type: 'fixed', on: { kind: 'monthDay', day: 11 } }, 'Monthly on the 11th'],
    ['the 15th', { type: 'fixed', on: { kind: 'monthDay', day: 15 } }, 'Monthly on the 15th'],
    [
      'the last day',
      { type: 'fixed', on: { kind: 'monthDay', day: 'last' } },
      'Monthly on the last day',
    ],
  ])('describes %s', (_description, schedule, expected) => {
    expect(describeSchedule(schedule)).toBe(expected);
  });
});
