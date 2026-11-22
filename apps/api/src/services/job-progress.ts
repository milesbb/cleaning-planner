import type { CompletionRecord, JobProgress } from '@cleaning-planner/contracts/completion';
import type { Job } from '@cleaning-planner/contracts/job';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { lastCompletedOn } from '@cleaning-planner/schedule/completions';
import { nextDueDate } from '@cleaning-planner/schedule/next-due';
import type { CompletionHistory } from '@cleaning-planner/schedule/next-due';
import type { Snooze } from '@cleaning-planner/schedule/types';

export function latestCompletionOf(history: readonly CompletionRecord[]): CompletionRecord | null {
  return history.reduce<CompletionRecord | null>(
    (latest, completion) =>
      latest === null || completion.doneAt > latest.doneAt ? completion : latest,
    null,
  );
}

function historyOf(job: Job, history: readonly CompletionRecord[]): CompletionHistory {
  return { startDate: job.startDate, lastDoneOn: lastCompletedOn(history) };
}

export function scheduledDueDate(job: Job, history: readonly CompletionRecord[]): CalendarDate {
  return nextDueDate(job.schedule, historyOf(job, history));
}

export function progressOf(
  job: Job,
  history: readonly CompletionRecord[],
  snooze: Snooze | null = job.snooze,
): JobProgress {
  const unsnoozedDueDate = scheduledDueDate(job, history);
  const dueDate =
    snooze === null
      ? unsnoozedDueDate
      : nextDueDate(job.schedule, { ...historyOf(job, history), snooze });
  return {
    jobId: job.id,
    nextDueDate: dueDate,
    snooze: dueDate === unsnoozedDueDate ? null : snooze,
    latestCompletion: latestCompletionOf(history),
  };
}
