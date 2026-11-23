'use client';

import type { HouseholdSummary } from '@cleaning-planner/contracts/household';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { homeToday } from '@/lib/home/home-day';
import { useAgenda, useHousehold, useJobs, useProgress } from '@/lib/home/home-queries';
import { useCurrentHome } from '@/lib/home/use-current-home';
import { buildWeekView, weekRange, weekTitle } from './week-view';
import type { WeekRange, WeekView } from './week-view';

interface ReadyWeek {
  kind: 'ready';
  title: string;
  today: CalendarDate;
  range: WeekRange;
  view: WeekView;
  homes: readonly HouseholdSummary[];
  currentHomeId: string;
  switchHome: (householdId: string) => void;
  offset: number;
  showWeek: (offset: number) => void;
}

export type WeekState =
  | { kind: 'loading' }
  | { kind: 'noHome' }
  | { kind: 'failed'; message: string; retry: () => void }
  | ReadyWeek;

function failedState(queries: readonly UseQueryResult[]): WeekState | null {
  const failed = queries.find((query) => query.isError);
  if (failed === undefined) return null;
  return { kind: 'failed', message: failed.error.message, retry: () => void failed.refetch() };
}

interface WeekQueries {
  queries: readonly UseQueryResult[];
  week: { today: CalendarDate; range: WeekRange; view: WeekView } | null;
}

function useWeekQueries(householdId: string | null, offset: number): WeekQueries {
  const household = useHousehold(householdId);
  const jobs = useJobs(householdId);
  const today = household.data === undefined ? null : homeToday(household.data);
  const range =
    today === null || household.data === undefined
      ? null
      : weekRange(today, household.data.weekStartsOn, offset);
  const agenda = useAgenda(householdId, range === null ? null : { ...range, person: null });
  const progress = useProgress(householdId);
  const nextDueDates = new Map(
    (progress.data ?? []).map((entry) => [entry.jobId, entry.nextDueDate]),
  );
  const isLoaded =
    today !== null && range !== null && jobs.data !== undefined && agenda.data !== undefined;
  return {
    queries: [household, jobs, agenda],
    week: isLoaded
      ? {
          today,
          range,
          view: buildWeekView({ agenda: agenda.data, jobs: jobs.data, today, nextDueDates }),
        }
      : null,
  };
}

// The current home's week (or one `offset` weeks away), following its week start.
// Progress only says which jobs can be moved, so the week shows without it.
export function useWeek(): WeekState {
  const current = useCurrentHome();
  const [offset, showWeek] = useState(0);
  const { queries, week } = useWeekQueries(current.home?.id ?? null, offset);
  const failed = failedState([current.homes, ...queries]);
  if (failed !== null) return failed;
  if (current.homes.data?.length === 0) return { kind: 'noHome' };
  if (current.home === null || week === null) return { kind: 'loading' };
  return {
    kind: 'ready',
    title: weekTitle(offset, week.range.from),
    today: week.today,
    range: week.range,
    view: week.view,
    homes: current.homes.data ?? [],
    currentHomeId: current.home.id,
    switchHome: current.switchHome,
    offset,
    showWeek,
  };
}
