import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import type { Job } from '@cleaning-planner/contracts/job';
import { addInterval } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import type { JobIconKey } from '@cleaning-planner/schedule/library/types';
import { formatDayHeading, formatShortDate } from '@/lib/format-date';
import type { WeekRange } from './week-view';

// "Coming up": the four weeks after the week shown, each job once per week
// with the days it's due.

const COMING_UP_WEEKS = 4;
const DAYS_PER_WEEK = 7;

interface ComingUpJob {
  jobId: string;
  name: string;
  icon: JobIconKey;
  when: string;
}

export interface ComingUpWeek {
  start: CalendarDate;
  title: string;
  jobs: ComingUpJob[];
}

interface ComingUpSources {
  agenda: AgendaResponse;
  jobs: readonly Job[];
}

const shortWeekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });

function daysAfter(date: CalendarDate, days: number): CalendarDate {
  return addInterval(date, { value: days, unit: 'day' });
}

export function comingUpRange(week: WeekRange): WeekRange {
  const from = daysAfter(week.to, 1);
  return { from, to: daysAfter(from, COMING_UP_WEEKS * DAYS_PER_WEEK - 1) };
}

function whenText(dueDays: readonly CalendarDate[]): string {
  const [onlyDay] = dueDays;
  if (dueDays.length === 1 && onlyDay !== undefined) return formatDayHeading(onlyDay);
  if (dueDays.length === DAYS_PER_WEEK) return 'Every day';
  return dueDays.map((day) => shortWeekdayFormat.format(new Date(`${day}T00:00:00Z`))).join(', ');
}

// Each job's due days within one week, in the order they first fall due.
function dueDaysByJob(agendaDays: AgendaResponse['days']): Map<string, CalendarDate[]> {
  const byJob = new Map<string, CalendarDate[]>();
  for (const day of agendaDays) {
    for (const item of day.due) byJob.set(item.jobId, [...(byJob.get(item.jobId) ?? []), day.date]);
  }
  return byJob;
}

function weekOf(start: CalendarDate, sources: ComingUpSources): ComingUpWeek {
  const end = daysAfter(start, DAYS_PER_WEEK - 1);
  const days = sources.agenda.days.filter((day) => day.date >= start && day.date <= end);
  const jobs = [...dueDaysByJob(days)].flatMap(([jobId, dueDays]) => {
    const job = sources.jobs.find((candidate) => candidate.id === jobId);
    return job === undefined
      ? []
      : [{ jobId, name: job.name, icon: job.icon, when: whenText(dueDays) }];
  });
  return { start, title: `Week of ${formatShortDate(start)}`, jobs };
}

export function buildComingUp(sources: ComingUpSources, range: WeekRange): ComingUpWeek[] {
  return Array.from({ length: COMING_UP_WEEKS }, (_, index) =>
    weekOf(daysAfter(range.from, index * DAYS_PER_WEEK), sources),
  );
}
