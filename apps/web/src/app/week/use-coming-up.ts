'use client';

import { useAgenda, useJobs } from '@/lib/home/home-queries';
import { buildComingUp, comingUpRange } from './coming-up-view';
import type { ComingUpWeek } from './coming-up-view';
import type { WeekRange } from './week-view';

export type ComingUpState =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string; retry: () => void }
  | { kind: 'ready'; weeks: ComingUpWeek[] };

export function useComingUp(householdId: string, week: WeekRange): ComingUpState {
  const range = comingUpRange(week);
  const jobs = useJobs(householdId);
  const agenda = useAgenda(householdId, { ...range, person: null });
  const failed = [jobs, agenda].find((query) => query.isError);
  if (failed !== undefined) {
    return { kind: 'failed', message: failed.error.message, retry: () => void failed.refetch() };
  }
  if (jobs.data === undefined || agenda.data === undefined) return { kind: 'loading' };
  return { kind: 'ready', weeks: buildComingUp({ agenda: agenda.data, jobs: jobs.data }, range) };
}
