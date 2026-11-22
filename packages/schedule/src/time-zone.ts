import { type CalendarDate, parseCalendarDate } from './calendar-date';

const UTC_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;

function isUtcInstant(instant: string): boolean {
  return UTC_INSTANT_PATTERN.test(instant) && !Number.isNaN(Date.parse(instant));
}

function dateFormatterFor(timeZone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    throw new Error(`Unknown time zone: ${timeZone}`);
  }
}

function datePart(parts: Intl.DateTimeFormatPart[], type: 'year' | 'month' | 'day'): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

export function calendarDateInTimeZone(instant: string, timeZone: string): CalendarDate {
  if (!isUtcInstant(instant)) {
    throw new Error(`Expected a UTC instant like 2026-11-22T08:30:00Z, got ${instant}`);
  }
  const parts = dateFormatterFor(timeZone).formatToParts(new Date(instant));
  return parseCalendarDate(
    `${datePart(parts, 'year')}-${datePart(parts, 'month')}-${datePart(parts, 'day')}`,
  );
}
