import { recordIdSchema } from '@cleaning-planner/contracts/primitives';
import { Router } from 'express';
import { membershipOf, requireMember } from '../middlewares/membership';
import type { MembershipReader } from '../middlewares/membership';
import type { JobHistoryService } from '../services/job-history-service';
import { parseOrThrow } from '../utils/validation';

export function jobHistoryRouter(
  history: JobHistoryService,
  memberships: MembershipReader,
): Router {
  const router = Router({ mergeParams: true });
  router.get('/', requireMember(memberships), async (request, response) => {
    const jobId = parseOrThrow(recordIdSchema, request.params.jobId);
    response.json(await history.listHistory(membershipOf(response).householdId, jobId));
  });
  return router;
}
