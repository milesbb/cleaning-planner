'use client';

import { failureOf, useWeekData } from '../week/use-week';
import type { WeekView } from '../week/week-view';

export type WeekStripState =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string; retry: () => void }
  | { kind: 'ready'; view: WeekView };

const THIS_WEEK = { offset: 0, showsMoves: false } as const;

// The same current week Week shows (one agenda request, shared cache), without
// the progress Week needs for moving jobs.
export function useWeekStrip(householdId: string): WeekStripState {
  const { queries, week } = useWeekData(householdId, THIS_WEEK);
  const failure = failureOf(queries);
  if (failure !== null) return { kind: 'failed', ...failure };
  if (week === null) return { kind: 'loading' };
  return { kind: 'ready', view: week.view };
}
