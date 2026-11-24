import type { HouseholdSummary } from '@cleaning-planner/contracts/household';
import type { UseQueryResult } from '@tanstack/react-query';

type HomesAnswer = Pick<UseQueryResult<HouseholdSummary[]>, 'data' | 'isFetching'>;

// An empty list saved on this device (from Start or join, say) can be out of
// date, so a screen only sends you to start a home once the API has answered.
export function isHomeless(homes: HomesAnswer): boolean {
  return homes.data?.length === 0 && !homes.isFetching;
}
