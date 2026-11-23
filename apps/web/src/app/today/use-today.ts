'use client';

import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import type { Household, HouseholdSummary, Member } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import type { Profile } from '@cleaning-planner/contracts/profile';
import type { Room } from '@cleaning-planner/contracts/room';
import { addInterval } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { calendarDateInTimeZone } from '@cleaning-planner/schedule/time-zone';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import {
  useAgenda,
  useHousehold,
  useJobs,
  useMe,
  useMembers,
  useRooms,
} from '@/lib/home/home-queries';
import type { AgendaRange } from '@/lib/home/home-queries';
import { useCurrentHome } from '@/lib/home/use-current-home';
import type { CurrentHome } from '@/lib/home/use-current-home';
import { buildTodayView } from './today-view';
import type { TodaySources, TodayView } from './today-view';
import { useJobProgress } from './use-job-progress';
import type { JobProgress, ProgressContext } from './use-job-progress';

export type TodayFilter = 'everyone' | 'justMe';

interface ReadyToday {
  kind: 'ready';
  view: TodayView;
  today: CalendarDate;
  homes: readonly HouseholdSummary[];
  currentHomeId: string;
  switchHome: (householdId: string) => void;
  filter: TodayFilter;
  setFilter: (filter: TodayFilter) => void;
  progress: JobProgress;
}

export type TodayState =
  | { kind: 'loading' }
  | { kind: 'noHome' }
  | { kind: 'failed'; message: string; retry: () => void }
  | ReadyToday;

interface TodayQueries {
  me: UseQueryResult<Profile>;
  household: UseQueryResult<Household>;
  members: UseQueryResult<Member[]>;
  rooms: UseQueryResult<Room[]>;
  jobs: UseQueryResult<Job[]>;
  agenda: UseQueryResult<AgendaResponse>;
}

const ONE_DAY = { value: 1, unit: 'day' } as const;

function agendaRangeFor(
  household: Household | undefined,
  me: Profile | undefined,
  filter: TodayFilter,
): AgendaRange | null {
  if (household === undefined || me === undefined) return null;
  const today = calendarDateInTimeZone(new Date().toISOString(), household.timeZone);
  const person = filter === 'justMe' ? me.id : null;
  return { from: today, to: addInterval(today, ONE_DAY), person };
}

function useTodayQueries(householdId: string | null, filter: TodayFilter): TodayQueries {
  const me = useMe();
  const household = useHousehold(householdId);
  const range = agendaRangeFor(household.data, me.data, filter);
  return {
    me,
    household,
    members: useMembers(householdId),
    rooms: useRooms(householdId),
    jobs: useJobs(householdId),
    agenda: useAgenda(householdId, range),
  };
}

function sourcesFrom(queries: TodayQueries, filter: TodayFilter): TodaySources | null {
  const { me, members, rooms, jobs, agenda } = queries;
  const range = agendaRangeFor(queries.household.data, me.data, filter);
  if (range === null || me.data === undefined || agenda.data === undefined) return null;
  if (members.data === undefined || rooms.data === undefined || jobs.data === undefined) {
    return null;
  }
  return {
    agenda: agenda.data,
    jobs: jobs.data,
    rooms: rooms.data,
    members: members.data,
    myUserId: me.data.id,
    today: range.from,
    tomorrow: range.to,
  };
}

function failedState(current: CurrentHome, queries: TodayQueries): TodayState | null {
  const allQueries: readonly UseQueryResult[] = [
    current.homes,
    queries.me,
    queries.household,
    queries.members,
    queries.rooms,
    queries.jobs,
    queries.agenda,
  ];
  const failed = allQueries.find((query) => query.isError);
  if (failed === undefined) return null;
  return {
    kind: 'failed',
    message: failed.error.message,
    retry: () => void failed.refetch(),
  };
}

function progressContextFor(
  householdId: string | null,
  sources: TodaySources | null,
  filter: TodayFilter,
): ProgressContext | null {
  if (householdId === null || sources === null) return null;
  const person = filter === 'justMe' ? sources.myUserId : null;
  return {
    householdId,
    range: { from: sources.today, to: sources.tomorrow, person },
    myUserId: sources.myUserId,
    today: sources.today,
  };
}

// Everything Today needs: the current home, its people, rooms and jobs, and
// today's and tomorrow's agenda (for everyone, or just the signed-in person).
export function useToday(): TodayState {
  const current = useCurrentHome();
  const [filter, setFilter] = useState<TodayFilter>('everyone');
  const householdId = current.home?.id ?? null;
  const queries = useTodayQueries(householdId, filter);
  const sources = sourcesFrom(queries, filter);
  const progress = useJobProgress(progressContextFor(householdId, sources, filter));
  const failed = failedState(current, queries);
  if (failed !== null) return failed;
  if (current.homes.data?.length === 0) return { kind: 'noHome' };
  if (current.home === null || sources === null) return { kind: 'loading' };
  return {
    kind: 'ready',
    view: buildTodayView(sources),
    today: sources.today,
    homes: current.homes.data ?? [],
    currentHomeId: current.home.id,
    switchHome: current.switchHome,
    filter,
    setFilter,
    progress,
  };
}
