import { activityQuerySchema } from '@cleaning-planner/contracts/activity';
import { Router } from 'express';
import { membershipOf, requireMember } from '../middlewares/membership';
import type { MembershipReader } from '../middlewares/membership';
import type { ActivityService } from '../services/activity-service';
import { parseOrThrow } from '../utils/validation';

export function activityRouter(activity: ActivityService, memberships: MembershipReader): Router {
  const router = Router({ mergeParams: true });
  router.get('/', requireMember(memberships), async (request, response) => {
    const query = parseOrThrow(activityQuerySchema, request.query);
    response.json(await activity.listActivity(membershipOf(response).householdId, query));
  });
  return router;
}
