import {
  createCompletionRequestSchema,
  snoozeJobRequestSchema,
  undoCompletionRequestSchema,
} from '@cleaning-planner/contracts/completion';
import { recordIdSchema } from '@cleaning-planner/contracts/primitives';
import { Router } from 'express';
import type { Request } from 'express';
import { membershipOf, requireMember } from '../middlewares/membership';
import type { MembershipReader } from '../middlewares/membership';
import type { JobProgressService } from '../services/job-progress-service';
import { HttpStatus } from '../utils/http-status';
import { parseOrThrow } from '../utils/validation';

function jobIdOf(request: Request): string {
  return parseOrThrow(recordIdSchema, request.params.jobId);
}

export function jobProgressRouter(
  progress: JobProgressService,
  memberships: MembershipReader,
): Router {
  const router = Router({ mergeParams: true });
  router.use(requireMember(memberships));
  router.post('/completions', async (request, response) => {
    const completion = parseOrThrow(createCompletionRequestSchema, request.body);
    const result = await progress.completeJob(membershipOf(response), jobIdOf(request), completion);
    response.status(HttpStatus.created).json(result);
  });
  router.delete('/completions/latest', async (request, response) => {
    const undo = parseOrThrow(undoCompletionRequestSchema, request.body);
    response.json(await progress.undoLatest(membershipOf(response), jobIdOf(request), undo));
  });
  router.post('/snooze', async (request, response) => {
    const snooze = parseOrThrow(snoozeJobRequestSchema, request.body);
    response.json(await progress.snoozeJob(membershipOf(response), jobIdOf(request), snooze));
  });
  return router;
}
