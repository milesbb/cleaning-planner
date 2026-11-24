'use client';

import type { HouseholdSummary } from '@cleaning-planner/contracts/household';
import type { UseQueryResult } from '@tanstack/react-query';
import { homeToday } from './home-day';
import { useHousehold, useJobs, useMe, useMembers, useProgress, useRooms } from './home-queries';
import type { RoomSources } from './room-jobs';
import { useCurrentHome } from './use-current-home';
import { isHomeless } from './is-homeless';

interface ReadyRooms {
  kind: 'ready';
  sources: RoomSources;
  householdId: string;
  homes: readonly HouseholdSummary[];
  switchHome: (householdId: string) => void;
}

export type RoomSourcesState =
  | { kind: 'loading' }
  | { kind: 'noHome' }
  | { kind: 'failed'; message: string; retry: () => void }
  | ReadyRooms;

interface RoomQueries {
  queries: readonly UseQueryResult[];
  sources: RoomSources | null;
}

function useRoomQueries(householdId: string | null): RoomQueries {
  const me = useMe();
  const household = useHousehold(householdId);
  const rooms = useRooms(householdId);
  const jobs = useJobs(householdId);
  const progress = useProgress(householdId);
  const members = useMembers(householdId);
  const queries = [me, household, rooms, jobs, progress, members];
  if (
    me.data === undefined ||
    household.data === undefined ||
    rooms.data === undefined ||
    jobs.data === undefined ||
    progress.data === undefined ||
    members.data === undefined
  ) {
    return { queries, sources: null };
  }
  return {
    queries,
    sources: {
      rooms: rooms.data,
      jobs: jobs.data,
      progress: progress.data,
      members: members.data,
      myUserId: me.data.id,
      today: homeToday(household.data),
    },
  };
}

// The current home's rooms, jobs, next due dates and people, for Home and Room.
export function useRoomSources(): RoomSourcesState {
  const current = useCurrentHome();
  const { queries, sources } = useRoomQueries(current.home?.id ?? null);
  const failed = [current.homes, ...queries].find((query) => query.isError);
  if (failed !== undefined) {
    return { kind: 'failed', message: failed.error.message, retry: () => void failed.refetch() };
  }
  if (isHomeless(current.homes)) return { kind: 'noHome' };
  if (current.home === null || sources === null) return { kind: 'loading' };
  return {
    kind: 'ready',
    sources,
    householdId: current.home.id,
    homes: current.homes.data ?? [],
    switchHome: current.switchHome,
  };
}
