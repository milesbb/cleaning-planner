import type { ActivityEntry } from '@cleaning-planner/contracts/activity';
import type { Member } from '@cleaning-planner/contracts/household';
import { addInterval } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { formatShortDate } from '@/lib/format-date';
import { personLabel } from '@/lib/home/job-wording';

export interface ActivityPeople {
  members: readonly Member[];
  myUserId: string;
  today: CalendarDate;
}

const DAYS_NAMED_BY_WEEKDAY = 6;

const weekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' });

function daysBefore(date: CalendarDate, today: CalendarDate): number | null {
  for (let days = 0; days <= DAYS_NAMED_BY_WEEKDAY; days += 1) {
    if (addInterval(date, { value: days, unit: 'day' }) === today) return days;
  }
  return null;
}

// "Today", "Yesterday", a weekday within the last week, then a date.
export function activityDay(date: CalendarDate, today: CalendarDate): string {
  const days = daysBefore(date, today);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days === null) return formatShortDate(date);
  return weekdayFormat.format(new Date(`${date}T00:00:00Z`));
}

// "Sam · Clean the oven · Tuesday".
export function activityLine(entry: ActivityEntry, people: ActivityPeople): string {
  const person = personLabel(people.members, people.myUserId, entry.completedBy);
  const job = entry.outcome === 'skipped' ? `Skipped ${entry.jobName}` : entry.jobName;
  return `${person} · ${job} · ${activityDay(entry.completedOn, people.today)}`;
}
