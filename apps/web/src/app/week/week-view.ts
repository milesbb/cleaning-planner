import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import type { Job } from '@cleaning-planner/contracts/job';
import { addInterval } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { firstDayOfWeek, lastDayOfWeek } from '@cleaning-planner/schedule/due-status';
import type { JobIconKey } from '@cleaning-planner/schedule/library/types';
import type { Weekday } from '@cleaning-planner/schedule/types';
import { formatShortDate } from '@/lib/format-date';

const DAYS_PER_WEEK = 7;

type WeekJobState = 'toDo' | 'done' | 'late';

export interface WeekJob {
  jobId: string;
  name: string;
  icon: JobIconKey;
  state: WeekJobState;
  effortMinutes: number;
  // The due date a move would snooze, or null: only a job's current due date
  // can be moved, so done jobs and later repeats can't.
  movableFrom: CalendarDate | null;
}

interface WeekDay {
  date: CalendarDate;
  weekday: string;
  dayOfMonth: number;
  isToday: boolean;
  jobs: WeekJob[];
}

export interface WeekView {
  days: WeekDay[];
  progress: { done: number; total: number };
}

export interface WeekRange {
  from: CalendarDate;
  to: CalendarDate;
}

interface WeekSources {
  agenda: AgendaResponse;
  jobs: readonly Job[];
  today: CalendarDate;
  nextDueDates: ReadonlyMap<string, CalendarDate>;
}

type AgendaDay = AgendaResponse['days'][number];
type DueItem = AgendaDay['due'][number];

const weekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });

// The home's week containing today, moved `offset` whole weeks back or forward.
export function weekRange(today: CalendarDate, weekStartsOn: Weekday, offset: number): WeekRange {
  const shifted = addInterval(today, { value: offset * DAYS_PER_WEEK, unit: 'day' });
  return { from: firstDayOfWeek(shifted, weekStartsOn), to: lastDayOfWeek(shifted, weekStartsOn) };
}

export function weekTitle(offset: number, weekStart: CalendarDate): string {
  if (offset === 0) return 'This week';
  if (offset === 1) return 'Next week';
  if (offset === -1) return 'Last week';
  return `Week of ${formatShortDate(weekStart)}`;
}

function jobOf(
  jobs: readonly Job[],
  jobId: string,
  details: Pick<WeekJob, 'state' | 'movableFrom'>,
): WeekJob[] {
  const job = jobs.find((candidate) => candidate.id === jobId);
  if (job === undefined) return [];
  return [{ jobId, name: job.name, icon: job.icon, effortMinutes: job.effortMinutes, ...details }];
}

function dueJobOf(item: DueItem, sources: WeekSources): WeekJob[] {
  const isCurrentDueDate = sources.nextDueDates.get(item.jobId) === item.dueDate;
  return jobOf(sources.jobs, item.jobId, {
    state: item.status === 'late' ? 'late' : 'toDo',
    movableFrom: isCurrentDueDate ? item.dueDate : null,
  });
}

function dayOf(day: AgendaDay, sources: WeekSources): WeekDay {
  const instant = new Date(`${day.date}T00:00:00Z`);
  return {
    date: day.date,
    weekday: weekdayFormat.format(instant),
    dayOfMonth: instant.getUTCDate(),
    isToday: day.date === sources.today,
    jobs: [
      ...day.done.flatMap((item) =>
        jobOf(sources.jobs, item.jobId, { state: 'done', movableFrom: null }),
      ),
      ...day.due.flatMap((item) => dueJobOf(item, sources)),
    ],
  };
}

export function buildWeekView(sources: WeekSources): WeekView {
  const days = sources.agenda.days.map((day) => dayOf(day, sources));
  const allJobs = days.flatMap((day) => day.jobs);
  return {
    days,
    progress: {
      done: allJobs.filter((job) => job.state === 'done').length,
      total: allJobs.length,
    },
  };
}
