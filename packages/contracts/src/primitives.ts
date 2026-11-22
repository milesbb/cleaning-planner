import { isCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { WEEKDAYS_FROM_SUNDAY } from '@cleaning-planner/schedule/calendar-date';
import { z } from './zod';

const RECORD_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 50;
const MAX_EMAIL_LENGTH = 254;

export const PERSON_COLOURS = ['blue', 'pink', 'green', 'yellow', 'teal'] as const;

export const recordIdSchema = z.string().check(z.regex(RECORD_ID_PATTERN, "That id isn't valid"));

export const displayNameSchema = z
  .string()
  .check(
    z.trim(),
    z.minLength(1, 'Enter a name'),
    z.maxLength(MAX_NAME_LENGTH, `Keep it to ${String(MAX_NAME_LENGTH)} characters`),
  );

export const emailSchema = z
  .string()
  .check(
    z.trim(),
    z.toLowerCase(),
    z.maxLength(MAX_EMAIL_LENGTH, 'Enter an email address like name@example.com'),
    z.regex(EMAIL_PATTERN, 'Enter an email address like name@example.com'),
  );

export const calendarDateSchema = z.custom<CalendarDate>(
  (value) => typeof value === 'string' && isCalendarDate(value),
  'Use a date like 2026-11-23',
);

export const instantSchema = z.iso.datetime({
  error: 'Use a UTC time like 2026-11-23T08:40:00Z',
});

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const timeZoneSchema = z
  .string()
  .check(z.refine(isTimeZone, 'Pick a time zone from the list'));

export const weekdaySchema = z.enum(WEEKDAYS_FROM_SUNDAY);

export const personColourSchema = z.enum(PERSON_COLOURS);

export const versionSchema = z.int().check(z.minimum(1, 'Versions start at 1'));

export const idempotencyKeySchema = z
  .string()
  .check(z.regex(IDEMPOTENCY_KEY_PATTERN, "That request key isn't valid"));

export type RecordId = z.infer<typeof recordIdSchema>;
export type PersonColour = z.infer<typeof personColourSchema>;
