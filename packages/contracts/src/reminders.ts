import { recordIdSchema, timeZoneSchema, weekdaySchema } from './primitives';
import { z } from './zod';

const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const REMINDER_KINDS = ['daily', 'weekly', 'test'] as const;

export const timeOfDaySchema = z
  .string()
  .check(z.regex(TIME_OF_DAY_PATTERN, 'Use a time like 08:30'));

export const reminderSettingsSchema = z.strictObject({
  timeZone: timeZoneSchema,
  daily: z.strictObject({ isOn: z.boolean(), time: timeOfDaySchema }),
  weekly: z.strictObject({ isOn: z.boolean(), day: weekdaySchema, time: timeOfDaySchema }),
  onlyMyJobs: z.boolean(),
  alsoByEmail: z.boolean(),
});

export const testReminderRequestSchema = z.optional(z.strictObject({}));

// What a reminder schedule (or a test) hands the notify function.
export const reminderEventSchema = z.strictObject({
  userId: recordIdSchema,
  reminder: z.enum(REMINDER_KINDS),
});

export type ReminderSettings = z.infer<typeof reminderSettingsSchema>;
export type ReminderKind = (typeof REMINDER_KINDS)[number];
export type ReminderEvent = z.infer<typeof reminderEventSchema>;
