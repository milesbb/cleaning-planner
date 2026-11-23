import type { Household } from '@cleaning-planner/contracts/household';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { calendarDateInTimeZone } from '@cleaning-planner/schedule/time-zone';

// Today's date where the home is, which is what every list of jobs is about.
export function homeToday({ timeZone }: Pick<Household, 'timeZone'>): CalendarDate {
  return calendarDateInTimeZone(new Date().toISOString(), timeZone);
}
