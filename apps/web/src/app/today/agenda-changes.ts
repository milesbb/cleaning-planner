import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';

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
