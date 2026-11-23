import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { withJobMoved } from '@/app/week/move-job';

// The agenda as it will look once the server agrees, so a tick shows at once.

export type DueItem = AgendaResponse['late'][number];
type AgendaDay = AgendaResponse['days'][number];

interface DoneToday {
  today: CalendarDate;
  doneBy: string;
}

function withoutJob<Item extends { jobId: string }>(items: readonly Item[], jobId: string): Item[] {
  return items.filter((item) => item.jobId !== jobId);
}

export function findDueItem(agenda: AgendaResponse, jobId: string): DueItem | null {
  const dueItems = [...agenda.late, ...agenda.days.flatMap((day) => day.due)];
  return dueItems.find((item) => item.jobId === jobId) ?? null;
}

export function withJobDone(
  agenda: AgendaResponse,
  jobId: string,
  { today, doneBy }: DoneToday,
): AgendaResponse {
  const markDone = (day: AgendaDay): AgendaDay =>
    day.date === today
      ? {
          ...day,
          due: withoutJob(day.due, jobId),
          done: [...day.done, { jobId, completedOn: today, completedBy: doneBy }],
        }
      : day;
  return { late: withoutJob(agenda.late, jobId), days: agenda.days.map(markDone) };
}

export function withJobUndone(
  agenda: AgendaResponse,
  jobId: string,
  today: CalendarDate,
  wasDue: DueItem | null,
): AgendaResponse {
  const isLate = wasDue?.status === 'late';
  const restoreDue = (day: AgendaDay): AgendaDay => {
    if (day.date !== today) return day;
    const due = wasDue === null || isLate ? day.due : [...day.due, wasDue];
    return { ...day, due, done: withoutJob(day.done, jobId) };
  };
  const late = isLate ? [...agenda.late, wasDue] : agenda.late;
  return { late, days: agenda.days.map(restoreDue) };
}

export function withJobSkipped(agenda: AgendaResponse, jobId: string): AgendaResponse {
  return {
    late: withoutJob(agenda.late, jobId),
    days: agenda.days.map((day) => ({ ...day, due: withoutJob(day.due, jobId) })),
  };
}

// A snooze from Today moves the job, wherever it's due, to the day it's put off until.
export function withJobSnoozed(
  agenda: AgendaResponse,
  jobId: string,
  until: CalendarDate,
): AgendaResponse {
  const dueItem = findDueItem(agenda, jobId);
  if (dueItem === null) return agenda;
  return withJobMoved(agenda, { jobId, from: dueItem.dueDate, until });
}
