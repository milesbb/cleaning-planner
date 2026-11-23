import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import type { Member } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import type { Room } from '@cleaning-planner/contracts/room';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import type { JobIconKey, RoomType } from '@cleaning-planner/schedule/library/types';
import { lateByText, personLabel } from '@/lib/home/job-wording';

export interface TodaySources {
  agenda: AgendaResponse;
  jobs: readonly Job[];
  rooms: readonly Room[];
  members: readonly Member[];
  myUserId: string;
  today: CalendarDate;
  tomorrow: CalendarDate;
}

export interface TodayJob {
  jobId: string;
  name: string;
  icon: JobIconKey;
  room: RoomType;
  meta: string;
  effortMinutes: number;
  assignee: Member | null;
}

export interface LateJob extends TodayJob {
  lateBy: string;
}

export interface DoneJob extends TodayJob {
  doneBy: string;
}

export interface TodayView {
  late: LateJob[];
  today: TodayJob[];
  done: DoneJob[];
  tomorrow: TodayJob[];
  minutesLeft: number;
}

type DueItem = AgendaResponse['late'][number];

function doneByText(sources: TodaySources, userId: string): string {
  if (userId === sources.myUserId) return 'you';
  return sources.members.find((member) => member.userId === userId)?.name ?? 'a former member';
}

function describeJob(
  sources: TodaySources,
  jobId: string,
  assigneeId: string | null,
): TodayJob | null {
  const job = sources.jobs.find((candidate) => candidate.id === jobId);
  const room = sources.rooms.find((candidate) => candidate.id === job?.roomId);
  if (job === undefined || room === undefined) return null;
  return {
    jobId,
    name: job.name,
    icon: job.icon,
    room: room.type,
    meta: `${room.name} · ${personLabel(sources.members, sources.myUserId, assigneeId)} · ${String(job.effortMinutes)} min`,
    effortMinutes: job.effortMinutes,
    assignee: sources.members.find((member) => member.userId === assigneeId) ?? null,
  };
}

function isPresent<Value>(value: Value | null): value is Value {
  return value !== null;
}

function dueJobs(sources: TodaySources, items: readonly DueItem[]): TodayJob[] {
  return items.map((item) => describeJob(sources, item.jobId, item.assignee)).filter(isPresent);
}

function dayOf(
  sources: TodaySources,
  date: CalendarDate,
): AgendaResponse['days'][number] | undefined {
  return sources.agenda.days.find((day) => day.date === date);
}

function lateJobs(sources: TodaySources): LateJob[] {
  return sources.agenda.late.flatMap((item) => {
    const job = describeJob(sources, item.jobId, item.assignee);
    return job === null ? [] : [{ ...job, lateBy: lateByText(item.dueDate, sources.today) }];
  });
}

function doneJobs(sources: TodaySources): DoneJob[] {
  return (dayOf(sources, sources.today)?.done ?? []).flatMap((item) => {
    const job = describeJob(sources, item.jobId, item.completedBy);
    return job === null ? [] : [{ ...job, doneBy: doneByText(sources, item.completedBy) }];
  });
}

function totalMinutes(jobs: readonly TodayJob[]): number {
  return jobs.reduce((total, job) => total + job.effortMinutes, 0);
}

// What Today shows: late jobs, today's jobs (due and done) and tomorrow's.
export function buildTodayView(sources: TodaySources): TodayView {
  const late = lateJobs(sources);
  const today = dueJobs(sources, dayOf(sources, sources.today)?.due ?? []);
  return {
    late,
    today,
    done: doneJobs(sources),
    tomorrow: dueJobs(sources, dayOf(sources, sources.tomorrow)?.due ?? []),
    minutesLeft: totalMinutes(late) + totalMinutes(today),
  };
}
