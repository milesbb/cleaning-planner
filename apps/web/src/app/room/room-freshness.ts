import type { JobProgress } from '@cleaning-planner/contracts/completion';
import type { Job } from '@cleaning-planner/contracts/job';
import { daysBetween } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { freshness } from '@cleaning-planner/schedule/freshness';

export interface JobFreshness {
  level: number;
  label: string;
}

function freshnessLabel(daysLeft: number): string {
  if (daysLeft <= 0) return 'Ready for a clean';
  return `Fresh for about ${String(daysLeft)} more ${daysLeft === 1 ? 'day' : 'days'}`;
}

// The freshness bar for a repeat-after-done job on Room; null for jobs on set
// days, or while the job's progress hasn't loaded.
export function freshnessOfJob(
  job: Job,
  progress: JobProgress | undefined,
  today: CalendarDate,
): JobFreshness | null {
  if (progress === undefined) return null;
  const level = freshness(
    job.schedule,
    {
      startDate: job.startDate,
      lastDoneOn: progress.latestCompletion?.completedOn ?? null,
      ...(progress.snooze === null ? {} : { snooze: progress.snooze }),
    },
    today,
  );
  if (level === null) return null;
  return { level, label: freshnessLabel(daysBetween(today, progress.nextDueDate)) };
}
