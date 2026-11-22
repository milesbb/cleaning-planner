import type { Assignment, Schedule, Snooze } from '@cleaning-planner/schedule/types';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { assignmentSchema, scheduleSchema, snoozeSchema } from './schedule';
import { fieldErrorsFor } from './test-support';
import type { z } from './zod';

describe('scheduleSchema', () => {
  it('produces the schedule engine types', () => {
    expectTypeOf<z.infer<typeof scheduleSchema>>().toExtend<Schedule>();
    expectTypeOf<z.infer<typeof assignmentSchema>>().toExtend<Assignment>();
    expectTypeOf<z.infer<typeof snoozeSchema>>().toExtend<Snooze>();
  });

  it.each([
    { type: 'floating', every: { value: 2, unit: 'week' } },
    { type: 'fixed', on: { kind: 'weekdays', weekdays: ['monday', 'thursday'] } },
    { type: 'fixed', on: { kind: 'monthDay', day: 1 } },
    { type: 'fixed', on: { kind: 'monthDay', day: 'last' } },
  ])('accepts %j', (schedule) => {
    expect(scheduleSchema.parse(schedule)).toEqual(schedule);
  });

  it('needs a whole number of at least 1 to repeat by', () => {
    expect(
      fieldErrorsFor(scheduleSchema, { type: 'floating', every: { value: 0, unit: 'day' } }),
    ).toEqual({ 'every.value': 'Repeat at least every 1' });
    expect(
      fieldErrorsFor(scheduleSchema, { type: 'floating', every: { value: 1.5, unit: 'day' } }),
    ).toEqual({ 'every.value': 'Invalid input: expected int, received number' });
  });

  it('caps how far apart repeats can be', () => {
    expect(
      fieldErrorsFor(scheduleSchema, { type: 'floating', every: { value: 400, unit: 'day' } }),
    ).toEqual({ 'every.value': 'Repeat at most every 365' });
  });

  it('needs at least one weekday, each picked once', () => {
    const noDays = { type: 'fixed', on: { kind: 'weekdays', weekdays: [] } };
    const repeatedDay = { type: 'fixed', on: { kind: 'weekdays', weekdays: ['monday', 'monday'] } };
    expect(fieldErrorsFor(scheduleSchema, noDays)).toEqual({
      'on.weekdays': 'Pick at least one day',
    });
    expect(fieldErrorsFor(scheduleSchema, repeatedDay)).toEqual({
      'on.weekdays': 'Pick each day once',
    });
  });

  it('only allows days 1 to 31 or the last day of the month', () => {
    expect(
      fieldErrorsFor(scheduleSchema, { type: 'fixed', on: { kind: 'monthDay', day: 32 } }),
    ).toHaveProperty(['on.day']);
  });

  it('rejects unknown schedule types and extra fields', () => {
    expect(Object.keys(fieldErrorsFor(scheduleSchema, { type: 'yearly' }))).toEqual(['type']);
    expect(
      fieldErrorsFor(scheduleSchema, {
        type: 'floating',
        every: { value: 1, unit: 'week' },
        colour: 'red',
      }),
    ).toEqual({ request: 'Unrecognized key: "colour"' });
  });
});

describe('assignmentSchema', () => {
  it.each([{ kind: 'anyone' }, { kind: 'member', memberId: 'user-1' }, { kind: 'takeTurns' }])(
    'accepts %j',
    (assignment) => {
      expect(assignmentSchema.parse(assignment)).toEqual(assignment);
    },
  );

  it('needs a member id when assigned to one person', () => {
    expect(fieldErrorsFor(assignmentSchema, { kind: 'member' })).toEqual({
      memberId: 'Invalid input: expected string, received undefined',
    });
  });
});

describe('snoozeSchema', () => {
  it('accepts a snooze that ends after it starts', () => {
    const snooze = { from: '2026-11-23', until: '2026-11-25' };
    expect(snoozeSchema.parse(snooze)).toEqual(snooze);
  });

  it('rejects a snooze that ends before it starts', () => {
    expect(fieldErrorsFor(snoozeSchema, { from: '2026-11-25', until: '2026-11-23' })).toEqual({
      until: 'Snooze until a later day',
    });
  });
});
