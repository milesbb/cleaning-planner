'use client';

import { activityEntrySchema } from '@cleaning-planner/contracts/activity';
import type { ActivityEntry } from '@cleaning-planner/contracts/activity';
import { z } from '@cleaning-planner/contracts/zod';
import type { UseQueryResult } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/api/api-provider';
import { homePath } from '@/lib/home/home-queries';

// Keyed under the home, so ticking a job off anywhere refreshes it.
export function useActivity(
  householdId: string,
  limit: number,
  isEnabled = true,
): UseQueryResult<ActivityEntry[]> {
  return useApiQuery(
    ['home', householdId, 'activity', limit],
    {
      method: 'GET',
      path: `${homePath(householdId)}/activity?limit=${String(limit)}`,
      response: z.array(activityEntrySchema),
    },
    { isEnabled },
  );
}
