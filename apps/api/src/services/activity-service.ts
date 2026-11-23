import { DEFAULT_ACTIVITY_ENTRIES } from '@cleaning-planner/contracts/activity';
import type { ActivityEntry, ActivityQuery } from '@cleaning-planner/contracts/activity';

export interface ActivityStore {
  // The home's latest done and skipped jobs, newest first, at most `limit`.
  listActivity: (householdId: string, limit: number) => Promise<ActivityEntry[]>;
}

export interface ActivityService {
  listActivity: (householdId: string, query: ActivityQuery) => Promise<ActivityEntry[]>;
}

export function createActivityService({ activity }: { activity: ActivityStore }): ActivityService {
  return {
    listActivity: (householdId, { limit }) =>
      activity.listActivity(
        householdId,
        limit === undefined ? DEFAULT_ACTIVITY_ENTRIES : Number(limit),
      ),
  };
}
