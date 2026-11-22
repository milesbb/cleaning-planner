import { calendarDateSchema, recordIdSchema, weekdaySchema } from './primitives';
import { hasNoRepeats } from './updates';
import { z } from './zod';

const MAX_REPEAT_VALUE = 365;
const LAST_DAY_OF_ANY_MONTH = 31;

const intervalSchema = z.strictObject({
  value: z
    .int()
    .check(
      z.minimum(1, 'Repeat at least every 1'),
      z.maximum(MAX_REPEAT_VALUE, `Repeat at most every ${String(MAX_REPEAT_VALUE)}`),
    ),
  unit: z.enum(['day', 'week', 'month']),
});

const weekdaysRuleSchema = z.strictObject({
  kind: z.literal('weekdays'),
  weekdays: z
    .array(weekdaySchema)
    .check(z.minLength(1, 'Pick at least one day'), z.refine(hasNoRepeats, 'Pick each day once')),
});

const monthDayRuleSchema = z.strictObject({
  kind: z.literal('monthDay'),
  day: z.union([z.int().check(z.minimum(1), z.maximum(LAST_DAY_OF_ANY_MONTH)), z.literal('last')]),
});

export const scheduleSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('floating'), every: intervalSchema }),
  z.strictObject({
    type: z.literal('fixed'),
    on: z.discriminatedUnion('kind', [weekdaysRuleSchema, monthDayRuleSchema]),
  }),
]);

export const assignmentSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('anyone') }),
  z.strictObject({ kind: z.literal('member'), memberId: recordIdSchema }),
  z.strictObject({ kind: z.literal('takeTurns') }),
]);

export const snoozeSchema = z
  .strictObject({ from: calendarDateSchema, until: calendarDateSchema })
  .check(
    z.refine((snooze) => snooze.until > snooze.from, {
      message: 'Snooze until a later day',
      path: ['until'],
    }),
  );
