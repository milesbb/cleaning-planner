import type { CompletionRecord } from '@cleaning-planner/contracts/completion';
import type { Job } from '@cleaning-planner/contracts/job';
import { addInterval, compareDates } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describeSchedule } from '@cleaning-planner/schedule/describe-schedule';
import { findLibraryJob, recommendationText } from '@cleaning-planner/schedule/library/job-library';
import type { JobIconKey, RoomType } from '@cleaning-planner/schedule/library/types';
import { formatShortDate } from '../format-date';
import { lateByText, personLabel } from './job-wording';
import { nextDueOf, whoFor } from './room-jobs';
import type { RoomSources } from './room-jobs';

// Everything the Job detail screen says about one job.

export interface JobDetails {
  jobId: string;
  name: string;
  icon: JobIconKey;
  roomName: string;
  roomType: RoomType;
  roomHref: string;
  nextDue: CalendarDate | null;
  when: string;
  lateBy?: string;
  howOften: string;
  recommendation: string | null;
  whoFor: string;
  why: string | null;
  howTo: readonly string[];
  lastDone: string;
  version: number;
}

export interface SnoozeChoice {
  label: string;
  until: CalendarDate;
}

const SNOOZE_DAYS = [1, 3, 7] as const;
const FROM_TODAY_LABELS = ['Tomorrow', 'In 3 days', 'In a week'] as const;
const FROM_DUE_DATE_LABELS = ['A day later', '3 days later', 'A week later'] as const;

function daysAfter(date: CalendarDate, days: number): CalendarDate {
  return addInterval(date, { value: days, unit: 'day' });
}

function whenText(job: Job, nextDue: CalendarDate | null, today: CalendarDate): string {
  if (nextDue === null) return 'Not scheduled';
  if (job.snooze !== null && job.snooze.until === nextDue) {
    return `Snoozed until ${formatShortDate(nextDue)}`;
  }
  if (compareDates(nextDue, today) < 0) return `Was due ${formatShortDate(nextDue)}`;
  if (nextDue === today) return 'Due today';
  if (nextDue === daysAfter(today, 1)) return 'Due tomorrow';
  return `Next due ${formatShortDate(nextDue)}`;
}

function lastDoneText(sources: RoomSources, completion: CompletionRecord | null): string {
  if (completion === null) return 'Not done yet';
  const verb = completion.outcome === 'done' ? 'Done' : 'Skipped';
  const person = personLabel(sources.members, sources.myUserId, completion.completedBy);
  return `${verb} by ${person} on ${formatShortDate(completion.completedOn)}`;
}

function adviceFor(job: Job): Pick<JobDetails, 'recommendation' | 'why' | 'howTo'> {
  const libraryJob = job.libraryId === null ? undefined : findLibraryJob(job.libraryId);
  if (libraryJob === undefined) return { recommendation: null, why: null, howTo: [] };
  return {
    recommendation: recommendationText(libraryJob.recommendedRange),
    why: libraryJob.why,
    howTo: libraryJob.howTo,
  };
}

function lateness(nextDue: CalendarDate | null, today: CalendarDate): { lateBy?: string } {
  return nextDue !== null && compareDates(nextDue, today) < 0
    ? { lateBy: lateByText(nextDue, today) }
    : {};
}

export function jobDetailsOf(sources: RoomSources, jobId: string): JobDetails | null {
  const job = sources.jobs.find((candidate) => candidate.id === jobId);
  const room = sources.rooms.find((candidate) => candidate.id === job?.roomId);
  if (job === undefined || room === undefined) return null;
  const nextDue = nextDueOf(sources, job.id);
  const latest = sources.progress.find((progress) => progress.jobId === jobId)?.latestCompletion;
  return {
    jobId: job.id,
    name: job.name,
    icon: job.icon,
    roomName: room.name,
    roomType: room.type,
    roomHref: `/room?id=${encodeURIComponent(room.id)}`,
    nextDue,
    when: whenText(job, nextDue, sources.today),
    ...lateness(nextDue, sources.today),
    howOften: describeSchedule(job.schedule),
    ...adviceFor(job),
    whoFor: whoFor(sources, job),
    lastDone: lastDoneText(sources, latest ?? null),
    version: job.version,
  };
}

// A snooze has to land after both today and the due date, so it counts from
// whichever is later.
export function snoozeChoices(nextDue: CalendarDate, today: CalendarDate): SnoozeChoice[] {
  const isDueYet = compareDates(nextDue, today) <= 0;
  const start = isDueYet ? today : nextDue;
  const labels = isDueYet ? FROM_TODAY_LABELS : FROM_DUE_DATE_LABELS;
  return SNOOZE_DAYS.map((days, index) => ({
    label: labels[index] ?? '',
    until: daysAfter(start, days),
  }));
}
