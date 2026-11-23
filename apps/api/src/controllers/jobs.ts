import { updateJobRequestSchema } from '@cleaning-planner/contracts/job';
import { createJobRequestSchema } from '@cleaning-planner/contracts/job-request';
import { recordIdSchema } from '@cleaning-planner/contracts/primitives';
import { Router } from 'express';
import type { Request } from 'express';
import { membershipOf, requireMember } from '../middlewares/membership';
import type { MembershipReader } from '../middlewares/membership';
import type { JobService } from '../services/job-service';
import { HttpStatus } from '../utils/http-status';
import { parseOrThrow } from '../utils/validation';

function jobIdOf(request: Request): string {
  return parseOrThrow(recordIdSchema, request.params.jobId);
}

export function jobsRouter(jobs: JobService, memberships: MembershipReader): Router {
  const router = Router({ mergeParams: true });
  router.use(requireMember(memberships));
  router.get('/', async (_request, response) => {
    response.json(await jobs.listJobs(membershipOf(response).householdId));
  });
  router.post('/', async (request, response) => {
    const newJob = parseOrThrow(createJobRequestSchema, request.body);
    const job = await jobs.addJob(membershipOf(response).householdId, newJob);
    response.status(HttpStatus.created).json(job);
  });
  router.get('/:jobId', async (request, response) => {
    response.json(await jobs.getJob(membershipOf(response).householdId, jobIdOf(request)));
  });
  router.patch('/:jobId', async (request, response) => {
    const changes = parseOrThrow(updateJobRequestSchema, request.body);
    const { householdId } = membershipOf(response);
    response.json(await jobs.updateJob(householdId, jobIdOf(request), changes));
  });
  router.delete('/:jobId', async (request, response) => {
    await jobs.deleteJob(membershipOf(response).householdId, jobIdOf(request));
    response.status(HttpStatus.noContent).end();
  });
  return router;
}
