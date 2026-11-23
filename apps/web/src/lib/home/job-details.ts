import type { CompletionRecord } from '@cleaning-planner/contracts/completion';
import type { Member } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import { addInterval, compareDates } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describeSchedule } from '@cleaning-planner/schedule/describe-schedule';
import { findLibraryJob, recommendationText } from '@cleaning-planner/schedule/library/job-library';
import type {
  JobIconKey,
  RecommendedRange,
  RoomType,
} from '@cleaning-planner/schedule/library/types';
import type { Assignment, Schedule } from '@cleaning-planner/schedule/types';
import { formatShortDate } from '../format-date';
import { assigneeChoices } from './assignee-choices';
import type { AssigneeChoice } from './assignee-choices';
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
  schedule: Schedule;
  recommendation: string | null;
  recommendedRange: RecommendedRange | null;
  recommendedSchedule: Schedule | null;
  whoFor: string;
  assignment: Assignment;
  assigneeChoices: AssigneeChoice[];
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

// "Done by Sam on 20 November".
export function completionText(
  members: readonly Member[],
  myUserId: string,
  completion: CompletionRecord,
): string {
  const verb = completion.outcome === 'done' ? 'Done' : 'Skipped';
  const person = personLabel(members, myUserId, completion.completedBy);
  return `${verb} by ${person} on ${formatShortDate(completion.completedOn)}`;
}

function lastDoneText(sources: RoomSources, completion: CompletionRecord | null): string {
  if (completion === null) return 'Not done yet';
  return completionText(sources.members, sources.myUserId, completion);
}

type Advice = Pick<
  JobDetails,
  'recommendation' | 'recommendedRange' | 'recommendedSchedule' | 'why' | 'howTo'
>;

const NO_ADVICE: Advice = {
  recommendation: null,
  recommendedRange: null,
  recommendedSchedule: null,
  why: null,
  howTo: [],
};

function adviceFor(job: Job): Advice {
  const libraryJob = job.libraryId === null ? undefined : findLibraryJob(job.libraryId);
  if (libraryJob === undefined) return NO_ADVICE;
  return {
    recommendation: recommendationText(libraryJob.recommendedRange),
    recommendedRange: libraryJob.recommendedRange,
    recommendedSchedule: libraryJob.defaultSchedule,
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
    schedule: job.schedule,
    ...adviceFor(job),
    whoFor: whoFor(sources, job),
    assignment: job.assignment,
    assigneeChoices: assigneeChoices(sources.members, sources.myUserId),
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
