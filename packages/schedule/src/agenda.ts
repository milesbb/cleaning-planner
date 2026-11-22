import { addInterval, type CalendarDate } from './calendar-date';
import { lastCompletedOn } from './completions';
import { classifyDue, type DueStatus } from './due-status';
import { nextDueDate } from './next-due';
import type { Assignment, Completion, Schedule, Snooze, Weekday } from './types';
import { whoseTurn } from './whose-turn';

export interface AgendaJob {
  id: string;
  schedule: Schedule;
  startDate: CalendarDate;
  assignment: Assignment;
  completions: readonly Completion[];
  snooze?: Snooze;
}

export interface AgendaRange {
  from: CalendarDate;
  to: CalendarDate;
}

export interface AgendaRequest {
  jobs: readonly AgendaJob[];
  memberIds: readonly string[];
  today: CalendarDate;
  weekStartsOn: Weekday;
  range: AgendaRange;
  person?: string;
}

export interface DueItem {
  jobId: string;
  dueDate: CalendarDate;
  status: DueStatus;
  assignee: string | null;
}

export interface DoneItem {
  jobId: string;
  completedOn: CalendarDate;
  completedBy: string;
}

export interface AgendaDay {
  date: CalendarDate;
  due: DueItem[];
  done: DoneItem[];
}

export interface Agenda {
  late: DueItem[];
  days: AgendaDay[];
}

export const MAX_AGENDA_DAYS = 62;

function datesInRange({ from, to }: AgendaRange): CalendarDate[] {
  if (to < from) throw new Error('An agenda range must end on or after its start');
  const dates: CalendarDate[] = [];
  for (let date = from; date <= to; date = addInterval(date, { value: 1, unit: 'day' })) {
    if (dates.length === MAX_AGENDA_DAYS) {
      throw new Error(`An agenda range can cover at most ${String(MAX_AGENDA_DAYS)} days`);
    }
    dates.push(date);
  }
  return dates;
}

function dueItemFor(job: AgendaJob, request: AgendaRequest): DueItem {
  const dueDate = nextDueDate(job.schedule, {
    startDate: job.startDate,
    lastDoneOn: lastCompletedOn(job.completions),
    ...(job.snooze === undefined ? {} : { snooze: job.snooze }),
  });
  return {
    jobId: job.id,
    dueDate,
    status: classifyDue(dueDate, request.today, request.weekStartsOn),
    assignee: whoseTurn(job.assignment, job.completions, request.memberIds),
  };
}

function doneItemsFor(job: AgendaJob): DoneItem[] {
  return job.completions
    .filter((completion) => completion.outcome === 'done')
    .map((completion) => ({
      jobId: job.id,
      completedOn: completion.completedOn,
      completedBy: completion.completedBy,
    }));
}

function isForPerson(assignee: string | null, person: string | undefined): boolean {
  return person === undefined || assignee === null || assignee === person;
}

function byDueDateThenJob(first: DueItem, second: DueItem): number {
  return first.dueDate.localeCompare(second.dueDate) || first.jobId.localeCompare(second.jobId);
}

function byJob(first: DoneItem, second: DoneItem): number {
  return first.jobId.localeCompare(second.jobId);
}

export function buildAgenda(request: AgendaRequest): Agenda {
  const dates = datesInRange(request.range);
  const dueItems = request.jobs
    .map((job) => dueItemFor(job, request))
    .filter((item) => isForPerson(item.assignee, request.person))
    .sort(byDueDateThenJob);
  const doneItems = request.jobs
    .flatMap(doneItemsFor)
    .filter((item) => isForPerson(item.completedBy, request.person))
    .sort(byJob);
  return {
    late: dueItems.filter((item) => item.status === 'late'),
    days: dates.map((date) => ({
      date,
      due: dueItems.filter((item) => item.dueDate === date),
      done: doneItems.filter((item) => item.completedOn === date),
    })),
  };
}
