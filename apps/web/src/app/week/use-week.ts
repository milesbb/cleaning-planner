'use client';

import type { HouseholdSummary } from '@cleaning-planner/contracts/household';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import type { Household } from '@cleaning-planner/contracts/household';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { homeToday } from '@/lib/home/home-day';
import { useAgenda, useHousehold, useJobs, useProgress } from '@/lib/home/home-queries';
import { useCurrentHome } from '@/lib/home/use-current-home';
import { buildWeekView, weekRange, weekTitle } from './week-view';
import type { WeekRange, WeekView } from './week-view';
import { isHomeless } from '@/lib/home/is-homeless';

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

interface WeekFailure {
  message: string;
  retry: () => void;
}

export function failureOf(queries: readonly UseQueryResult[]): WeekFailure | null {
  const failed = queries.find((query) => query.isError);
  if (failed === undefined) return null;
  return { message: failed.error.message, retry: () => void failed.refetch() };
}

interface WeekQueries {
  queries: readonly UseQueryResult[];
  week: (HomeWeek & { view: WeekView }) | null;
}

interface HomeWeek {
  today: CalendarDate;
  range: WeekRange;
}

function homeWeekOf(household: Household | undefined, offset: number): HomeWeek | null {
  if (household === undefined) return null;
  const today = homeToday(household);
  return { today, range: weekRange(today, household.weekStartsOn, offset) };
}

interface WeekChoice {
  offset: number;
  showsMoves: boolean;
}

// A week of the home's agenda. Which jobs can move comes from their progress,
// fetched only where moving is offered.
export function useWeekData(
  householdId: string | null,
  { offset, showsMoves }: WeekChoice,
): WeekQueries {
  const household = useHousehold(householdId);
  const jobs = useJobs(householdId);
  const homeWeek = homeWeekOf(household.data, offset);
  const agenda = useAgenda(
    householdId,
    homeWeek === null ? null : { ...homeWeek.range, person: null },
  );
  const progress = useProgress(showsMoves ? householdId : null);
  const nextDueDates = new Map(
    (progress.data ?? []).map((entry) => [entry.jobId, entry.nextDueDate]),
  );
  const isLoaded = homeWeek !== null && jobs.data !== undefined && agenda.data !== undefined;
  return {
    queries: [household, jobs, agenda],
    week: isLoaded
      ? {
          ...homeWeek,
          view: buildWeekView({
            agenda: agenda.data,
            jobs: jobs.data,
            today: homeWeek.today,
            nextDueDates,
          }),
        }
      : null,
  };
}

// The current home's week (or one `offset` weeks away), following its week start.
// Progress only says which jobs can be moved, so the week shows without it.
export function useWeek(): WeekState {
  const current = useCurrentHome();
  const [offset, showWeek] = useState(0);
  const { queries, week } = useWeekData(current.home?.id ?? null, { offset, showsMoves: true });
  const failure = failureOf([current.homes, ...queries]);
  if (failure !== null) return { kind: 'failed', ...failure };
  if (isHomeless(current.homes)) return { kind: 'noHome' };
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
