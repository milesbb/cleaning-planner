import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';

const longDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatLongDate(date: CalendarDate): string {
  return longDateFormat.format(new Date(`${date}T00:00:00Z`));
}

const dayHeadingFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

// "Tuesday 24 November", for the top of Today.
export function formatDayHeading(date: CalendarDate): string {
  return dayHeadingFormat.format(new Date(`${date}T00:00:00Z`)).replace(',', '');
}
