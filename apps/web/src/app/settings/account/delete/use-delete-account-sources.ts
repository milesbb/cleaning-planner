'use client';

import { memberSchema } from '@cleaning-planner/contracts/household';
import type { HouseholdSummary, Member } from '@cleaning-planner/contracts/household';
import type { Profile } from '@cleaning-planner/contracts/profile';
import { z } from '@cleaning-planner/contracts/zod';
import { useQueries } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api/api-provider';
import { homePath, useHomes, useMe } from '@/lib/home/home-queries';
import type { OwnedHome } from './owned-home-choices';

export type DeleteAccountSources =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string; retry: () => void }
  | { kind: 'ready'; profile: Profile; homes: HouseholdSummary[]; ownedHomes: OwnedHome[] };

// Same keys as useMembers, so the people already loaded for a home are reused.
function useOwnedHomesPeople(ownedHomes: readonly HouseholdSummary[]): UseQueryResult<Member[]>[] {
  const client = useApiClient();
  return useQueries({
    queries: ownedHomes.map((home) => ({
      queryKey: ['home', home.id, 'members'],
      queryFn: () =>
        client.request({
          method: 'GET',
          path: `${homePath(home.id)}/members`,
          response: z.array(memberSchema),
        }),
    })),
  });
}

function ownedHomesWithOthers(
  ownedHomes: readonly HouseholdSummary[],
  people: readonly Member[][],
  myUserId: string,
): OwnedHome[] {
  return ownedHomes.map((home, index) => ({
    home,
    others: (people[index] ?? []).filter((person) => person.userId !== myUserId),
  }));
}

export function useDeleteAccountSources(): DeleteAccountSources {
  const me = useMe();
  const homes = useHomes();
  const owned = (homes.data ?? []).filter((home) => home.role === 'owner');
  const people = useOwnedHomesPeople(owned);
  const failed = [me, homes, ...people].find((query) => query.isError);
  if (failed !== undefined) {
    return { kind: 'failed', message: failed.error.message, retry: () => void failed.refetch() };
  }
  const loadedPeople = people.flatMap((query) => (query.data === undefined ? [] : [query.data]));
  if (me.data === undefined || homes.data === undefined) return { kind: 'loading' };
  if (loadedPeople.length < owned.length) return { kind: 'loading' };
  return {
    kind: 'ready',
    profile: me.data,
    homes: homes.data,
    ownedHomes: ownedHomesWithOthers(owned, loadedPeople, me.data.id),
  };
}
