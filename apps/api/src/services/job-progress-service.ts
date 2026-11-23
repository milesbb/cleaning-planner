import type { ActivityEntry } from '@cleaning-planner/contracts/activity';
import type {
  CompletionRecord,
  CreateCompletionRequest,
  JobProgress,
  SnoozeJobRequest,
  UndoCompletionRequest,
} from '@cleaning-planner/contracts/completion';
import type { Job } from '@cleaning-planner/contracts/job';
import { addInterval } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { createSnooze } from '@cleaning-planner/schedule/snooze';
import { calendarDateInTimeZone } from '@cleaning-planner/schedule/time-zone';
import type { Snooze } from '@cleaning-planner/schedule/types';
import type { Membership } from '../middlewares/membership';
import { Errors } from '../utils/errors';
import type { HouseholdStore } from './household-service';
import { latestCompletionOf, progressOf, scheduledDueDate } from './job-progress';
import type { JobStore } from './job-service';

const UNDO_WINDOW_MINUTES = 30;
const REMEMBER_REQUESTS_FOR_HOURS = 24;
const MAX_SNOOZE_DAYS = 365;
const MILLISECONDS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const NOT_SAVED = 'Check the highlighted fields';

export interface RequestRef {
  householdId: string;
  userId: string;
  key: string;
}

export interface RequestRecord {
  userId: string;
  key: string;
  result: JobProgress;
  expiresAt: string;
}

export interface ProgressStore {
  listCompletions: (householdId: string, jobId: string) => Promise<CompletionRecord[]>;
  // Records the completion and the home's activity entry for it together.
  addCompletion: (
    householdId: string,
    entry: ActivityEntry,
    request: RequestRecord,
  ) => Promise<void>;
  removeCompletion: (
    householdId: string,
    completion: CompletionRecord,
    request: RequestRecord,
  ) => Promise<void>;
  snoozeJob: (
    householdId: string,
    job: Job,
    snooze: Snooze,
    request: RequestRecord,
  ) => Promise<void>;
  findResult: (request: RequestRef) => Promise<JobProgress | null>;
}

export interface JobProgressService {
  completeJob: (
    membership: Membership,
    jobId: string,
    request: CreateCompletionRequest,
  ) => Promise<JobProgress>;
  undoLatest: (
    membership: Membership,
    jobId: string,
    request: UndoCompletionRequest,
  ) => Promise<JobProgress>;
  snoozeJob: (
    membership: Membership,
    jobId: string,
    request: SnoozeJobRequest,
  ) => Promise<JobProgress>;
}

interface JobProgressDependencies {
  store: ProgressStore;
  jobs: Pick<JobStore, 'findJob'>;
  households: Pick<HouseholdStore, 'getHousehold'>;
  now: () => string;
}

interface JobContext {
  job: Job;
  history: CompletionRecord[];
  today: CalendarDate;
  remember: (result: JobProgress) => RequestRecord;
}

type ProgressStep = (context: JobContext) => Promise<JobProgress>;

function minutesLater(instant: string, minutes: number): string {
  return new Date(Date.parse(instant) + minutes * MILLISECONDS_PER_MINUTE).toISOString();
}

async function loadContext(
  { store, jobs, households, now }: JobProgressDependencies,
  { householdId, userId }: Membership,
  jobId: string,
  key: string,
): Promise<JobContext> {
  const [job, household, history] = await Promise.all([
    jobs.findJob(householdId, jobId),
    households.getHousehold(householdId),
    store.listCompletions(householdId, jobId),
  ]);
  if (job === null || household === null) throw Errors.notFound('No such job');
  const expiresAt = minutesLater(now(), REMEMBER_REQUESTS_FOR_HOURS * MINUTES_PER_HOUR);
  return {
    job,
    history,
    today: calendarDateInTimeZone(now(), household.timeZone),
    remember: (result) => ({ userId, key, result, expiresAt }),
  };
}

async function once(
  dependencies: JobProgressDependencies,
  [membership, jobId, key]: [Membership, string, string],
  step: ProgressStep,
): Promise<JobProgress> {
  const ref = { householdId: membership.householdId, userId: membership.userId, key };
  const earlier = await dependencies.store.findResult(ref);
  if (earlier !== null) return earlier;
  try {
    return await step(await loadContext(dependencies, membership, jobId, key));
  } catch (error) {
    const raced = await dependencies.store.findResult(ref);
    if (raced !== null) return raced;
    throw error;
  }
}

function completeStep(
  { store, now }: JobProgressDependencies,
  { householdId, userId }: Membership,
  { outcome, completedOn }: CreateCompletionRequest,
): ProgressStep {
  return async ({ job, history, today, remember }) => {
    if (completedOn > today) {
      throw Errors.badRequest(NOT_SAVED, { completedOn: 'Pick today or an earlier day' });
    }
    const completion = { jobId: job.id, outcome, completedOn, completedBy: userId, doneAt: now() };
    const progress = progressOf(job, [...history, completion]);
    await store.addCompletion(
      householdId,
      { ...completion, jobName: job.name },
      remember(progress),
    );
    return progress;
  };
}

function checkUndoable(
  latest: CompletionRecord | null,
  userId: string,
  now: string,
): CompletionRecord {
  if (latest === null) throw Errors.notFound('There is nothing to undo');
  if (latest.completedBy !== userId) {
    throw Errors.forbidden('You can only undo something you ticked off');
  }
  if (minutesLater(latest.doneAt, UNDO_WINDOW_MINUTES) < now) {
    throw Errors.conflict('That was too long ago to undo');
  }
  return latest;
}

function undoStep(
  { store, now }: JobProgressDependencies,
  { householdId, userId }: Membership,
): ProgressStep {
  return async ({ job, history, remember }) => {
    const latest = checkUndoable(latestCompletionOf(history), userId, now());
    const progress = progressOf(
      job,
      history.filter((completion) => completion !== latest),
    );
    await store.removeCompletion(householdId, latest, remember(progress));
    return progress;
  };
}

function snoozeFor(
  job: Job,
  history: CompletionRecord[],
  today: CalendarDate,
  until: CalendarDate,
): Snooze {
  if (until > addInterval(today, { value: MAX_SNOOZE_DAYS, unit: 'day' })) {
    throw Errors.badRequest(NOT_SAVED, { until: 'Snooze for a year at most' });
  }
  try {
    return createSnooze({
      currentDueDate: scheduledDueDate(job, history),
      requestedDate: until,
      today,
    });
  } catch {
    throw Errors.badRequest(NOT_SAVED, { until: 'Snooze to a later day' });
  }
}

function snoozeStep(
  { store }: JobProgressDependencies,
  { householdId }: Membership,
  { until }: SnoozeJobRequest,
): ProgressStep {
  return async ({ job, history, today, remember }) => {
    const snooze = snoozeFor(job, history, today, until);
    const progress = progressOf(job, history, snooze);
    await store.snoozeJob(householdId, job, snooze, remember(progress));
    return progress;
  };
}

export function createJobProgressService(
  dependencies: JobProgressDependencies,
): JobProgressService {
  return {
    completeJob: (membership, jobId, request) =>
      once(
        dependencies,
        [membership, jobId, request.idempotencyKey],
        completeStep(dependencies, membership, request),
      ),
    undoLatest: (membership, jobId, request) =>
      once(
        dependencies,
        [membership, jobId, request.idempotencyKey],
        undoStep(dependencies, membership),
      ),
    snoozeJob: (membership, jobId, request) =>
      once(
        dependencies,
        [membership, jobId, request.idempotencyKey],
        snoozeStep(dependencies, membership, request),
      ),
  };
}
