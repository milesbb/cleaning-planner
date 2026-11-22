import { addInterval, type CalendarDate } from './calendar-date';
import { firstFixedOccurrence } from './fixed-schedule';
import type { FloatingSchedule, IntervalUnit, Schedule } from './types';

export interface SpreadJob {
  id: string;
  schedule: Schedule;
}

export interface FirstDueDate {
  jobId: string;
  startDate: CalendarDate;
}

interface FloatingSpreadJob {
  id: string;
  schedule: FloatingSchedule;
}

const MAX_SPREAD_DAYS = 28;
const APPROXIMATE_DAYS_PER_UNIT: Record<IntervalUnit, number> = { day: 1, week: 7, month: 30 };

function spreadWindowInDays(schedule: FloatingSchedule): number {
  const intervalInDays = schedule.every.value * APPROXIMATE_DAYS_PER_UNIT[schedule.every.unit];
  return Math.min(intervalInDays, MAX_SPREAD_DAYS);
}

function isFloating(job: SpreadJob): job is FloatingSpreadJob {
  return job.schedule.type === 'floating';
}

function byWindowThenId(first: FloatingSpreadJob, second: FloatingSpreadJob): number {
  const windowDifference = spreadWindowInDays(first.schedule) - spreadWindowInDays(second.schedule);
  return windowDifference || first.id.localeCompare(second.id);
}

function addLoad(loadPerDay: Map<CalendarDate, number>, date: CalendarDate): void {
  loadPerDay.set(date, (loadPerDay.get(date) ?? 0) + 1);
}

function leastLoadedDay(
  windowInDays: number,
  startDate: CalendarDate,
  loadPerDay: Map<CalendarDate, number>,
): CalendarDate {
  let quietestDay = startDate;
  for (let offset = 1; offset < windowInDays; offset += 1) {
    const candidate = addInterval(startDate, { value: offset, unit: 'day' });
    if ((loadPerDay.get(candidate) ?? 0) < (loadPerDay.get(quietestDay) ?? 0)) {
      quietestDay = candidate;
    }
  }
  return quietestDay;
}

function countFixedJobs(
  jobs: readonly SpreadJob[],
  startDate: CalendarDate,
): Map<CalendarDate, number> {
  const loadPerDay = new Map<CalendarDate, number>();
  jobs.forEach(({ schedule }) => {
    if (schedule.type !== 'fixed') return;
    addLoad(loadPerDay, firstFixedOccurrence(schedule.on, startDate));
  });
  return loadPerDay;
}

export function spreadFirstDueDates(
  jobs: readonly SpreadJob[],
  startDate: CalendarDate,
): FirstDueDate[] {
  const loadPerDay = countFixedJobs(jobs, startDate);
  const startDateByJob = new Map<string, CalendarDate>();
  [...jobs.filter(isFloating)].sort(byWindowThenId).forEach((job) => {
    const quietestDay = leastLoadedDay(spreadWindowInDays(job.schedule), startDate, loadPerDay);
    addLoad(loadPerDay, quietestDay);
    startDateByJob.set(job.id, quietestDay);
  });
  return jobs.map((job) => ({ jobId: job.id, startDate: startDateByJob.get(job.id) ?? startDate }));
}
