// What the fakes for Alex's home, "Our flat", share: its API path, its days,
// and which jobs are due. Dates follow the real clock in UTC, the home's time zone.

export const HOME_PATH = '/v1/households/home-1';
export const DAY_MS = 86_400_000;

export function calendarDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

export function jobIdIn(url: string): string {
  return /jobs\/([^/?]+)/.exec(url)?.[1] ?? '';
}

export interface DueItem {
  jobId: string;
  dueDate: string;
  status: string;
  assignee: null;
}

function due(jobId: string, offsetDays: number, status: string): DueItem {
  return { jobId, dueDate: calendarDay(offsetDays), status, assignee: null };
}

// The oven is late (due two days ago), the vacuum and hob are due today, and
// anything ticked off is no longer due.
export function dueItemsFor(doneJobIds: ReadonlySet<string>): DueItem[] {
  return [
    due('job-oven', -2, 'late'),
    due('job-vacuum', 0, 'today'),
    due('job-hob', 0, 'today'),
  ].filter((item) => !doneJobIds.has(item.jobId));
}
