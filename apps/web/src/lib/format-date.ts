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
