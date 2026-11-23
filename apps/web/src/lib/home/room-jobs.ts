import type { JobProgress } from '@cleaning-planner/contracts/completion';
import type { Member } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import type { Room } from '@cleaning-planner/contracts/room';
import { addInterval, compareDates } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describeSchedule } from '@cleaning-planner/schedule/describe-schedule';
import type { JobIconKey, RoomType } from '@cleaning-planner/schedule/library/types';
import { formatShortDate } from '../format-date';
import { lateByText, personLabel } from './job-wording';

// Rooms with their jobs, for the Home and Room screens.

export interface RoomSources {
  rooms: readonly Room[];
  jobs: readonly Job[];
  progress: readonly JobProgress[];
  members: readonly Member[];
  myUserId: string;
  today: CalendarDate;
}

export interface RoomSummary {
  id: string;
  type: RoomType;
  name: string;
  jobCount: number;
  lateCount: number;
}

export interface RoomJob {
  jobId: string;
  name: string;
  icon: JobIconKey;
  meta: string;
  lateBy?: string;
}

const ONE_DAY = { value: 1, unit: 'day' } as const;

function nextDueOf(sources: RoomSources, jobId: string): CalendarDate | null {
  return sources.progress.find((progress) => progress.jobId === jobId)?.nextDueDate ?? null;
}

function isLate(sources: RoomSources, job: Job): boolean {
  const nextDue = nextDueOf(sources, job.id);
  return nextDue !== null && compareDates(nextDue, sources.today) < 0;
}

export function summariseRooms(sources: RoomSources): RoomSummary[] {
  return [...sources.rooms]
    .sort((first, second) => first.order - second.order)
    .map((room) => {
      const roomJobs = sources.jobs.filter((job) => job.roomId === room.id);
      return {
        id: room.id,
        type: room.type,
        name: room.name,
        jobCount: roomJobs.length,
        lateCount: roomJobs.filter((job) => isLate(sources, job)).length,
      };
    });
}

function whoFor(sources: RoomSources, job: Job): string {
  if (job.assignment.kind === 'takeTurns') return 'Take turns';
  const userId = job.assignment.kind === 'member' ? job.assignment.memberId : null;
  return personLabel(sources.members, sources.myUserId, userId);
}

function whenText(nextDue: CalendarDate | null, today: CalendarDate): string {
  if (nextDue === null) return 'not scheduled';
  if (compareDates(nextDue, today) < 0) return `was due ${formatShortDate(nextDue)}`;
  if (nextDue === today) return 'due today';
  if (nextDue === addInterval(today, ONE_DAY)) return 'due tomorrow';
  return `next ${formatShortDate(nextDue)}`;
}

function roomJobOf(sources: RoomSources, job: Job): RoomJob {
  const nextDue = nextDueOf(sources, job.id);
  const meta = `${describeSchedule(job.schedule)} · ${whoFor(sources, job)} · ${whenText(nextDue, sources.today)}`;
  const base = { jobId: job.id, name: job.name, icon: job.icon, meta };
  return nextDue !== null && isLate(sources, job)
    ? { ...base, lateBy: lateByText(nextDue, sources.today) }
    : base;
}

// A room's jobs, the soonest due first.
export function jobsInRoom(sources: RoomSources, roomId: string): RoomJob[] {
  const soonestFirst = (first: Job, second: Job): number =>
    (nextDueOf(sources, first.id) ?? '9999-12-31').localeCompare(
      nextDueOf(sources, second.id) ?? '9999-12-31',
    );
  return sources.jobs
    .filter((job) => job.roomId === roomId)
    .sort(soonestFirst)
    .map((job) => roomJobOf(sources, job));
}
