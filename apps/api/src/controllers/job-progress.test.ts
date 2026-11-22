import type { JobProgress } from '@cleaning-planner/contracts/completion';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Membership, MembershipReader } from '../middlewares/membership';
import type { JobProgressService } from '../services/job-progress-service';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';
import { Errors } from '../utils/errors';

const ALEX_IN_HOME: Membership = { householdId: 'home-1', userId: 'user-alex', role: 'member' };
const JOB_PATH = '/v1/households/home-1/jobs/job-vacuum';
const KEY = 'request-key-000000001';
const PROGRESS: JobProgress = {
  jobId: 'job-vacuum',
  nextDueDate: parseCalendarDate('2026-11-30'),
  snooze: null,
  latestCompletion: null,
};

const memberships: MembershipReader = {
  findMembership: (householdId, userId) =>
    Promise.resolve(householdId === 'home-1' && userId === 'user-alex' ? ALEX_IN_HOME : null),
};

function progressService(): JobProgressService {
  return {
    completeJob: vi.fn(() => Promise.resolve(PROGRESS)),
    undoLatest: vi.fn(() => Promise.resolve(PROGRESS)),
    snoozeJob: vi.fn(() => Promise.resolve(PROGRESS)),
  };
}

type Method = 'post' | 'delete';

function callAs(
  progress: JobProgressService,
  method: Method,
  path: string,
  userId: string,
): request.Test {
  const agent = request(testApp({ progress, memberships }));
  return agent[method](path).set(CLAIMS_HEADER, signedInAs(userId));
}

const PROGRESS_ROUTES = [
  [
    'post',
    `${JOB_PATH}/completions`,
    { outcome: 'done', completedOn: '2026-11-23', idempotencyKey: KEY },
  ],
  ['delete', `${JOB_PATH}/completions/latest`, { idempotencyKey: KEY }],
  ['post', `${JOB_PATH}/snooze`, { until: '2026-11-26', idempotencyKey: KEY }],
] as const;

describe('/v1/households/:householdId/jobs/:jobId progress', () => {
  it.each(PROGRESS_ROUTES)(
    'gives someone outside the home a 403 for %s %s and writes nothing',
    async (method, path, body) => {
      const progress = progressService();
      const response = await callAs(progress, method, path, 'user-stranger').send(body);
      expect(response.status).toBe(403);
      for (const operation of Object.values(progress)) expect(operation).not.toHaveBeenCalled();
    },
  );

  it.each(PROGRESS_ROUTES)('turns away %s %s without a request key', async (method, path, body) => {
    const progress = progressService();
    const response = await callAs(progress, method, path, 'user-alex').send({
      ...body,
      idempotencyKey: undefined,
    });
    expect(response.status).toBe(400);
    for (const operation of Object.values(progress)) expect(operation).not.toHaveBeenCalled();
  });

  it('ticks a job off and answers 201 with the next due date', async () => {
    const progress = progressService();
    const response = await callAs(progress, 'post', `${JOB_PATH}/completions`, 'user-alex').send({
      outcome: 'skipped',
      completedOn: '2026-11-23',
      idempotencyKey: KEY,
    });
    expect(response.status).toBe(201);
    expect(response.body).toEqual(PROGRESS);
    expect(progress.completeJob).toHaveBeenCalledWith(ALEX_IN_HOME, 'job-vacuum', {
      outcome: 'skipped',
      completedOn: '2026-11-23',
      idempotencyKey: KEY,
    });
  });

  it('undoes the latest tick', async () => {
    const progress = progressService();
    const response = await callAs(
      progress,
      'delete',
      `${JOB_PATH}/completions/latest`,
      'user-alex',
    ).send({ idempotencyKey: KEY });
    expect(response.status).toBe(200);
    expect(progress.undoLatest).toHaveBeenCalledWith(ALEX_IN_HOME, 'job-vacuum', {
      idempotencyKey: KEY,
    });
  });

  it('answers 403 when undoing someone else’s tick', async () => {
    const progress = progressService();
    vi.mocked(progress.undoLatest).mockRejectedValue(
      Errors.forbidden('You can only undo something you ticked off'),
    );
    const response = await callAs(
      progress,
      'delete',
      `${JOB_PATH}/completions/latest`,
      'user-alex',
    ).send({ idempotencyKey: KEY });
    expect(response.status).toBe(403);
  });

  it('snoozes a job', async () => {
    const progress = progressService();
    const response = await callAs(progress, 'post', `${JOB_PATH}/snooze`, 'user-alex').send({
      until: '2026-11-26',
      idempotencyKey: KEY,
    });
    expect(response.status).toBe(200);
    expect(progress.snoozeJob).toHaveBeenCalledWith(ALEX_IN_HOME, 'job-vacuum', {
      until: '2026-11-26',
      idempotencyKey: KEY,
    });
  });

  it('turns away a job id that cannot exist', async () => {
    const progress = progressService();
    const response = await callAs(
      progress,
      'post',
      `/v1/households/home-1/jobs/${'x'.repeat(100)}/snooze`,
      'user-alex',
    ).send({ until: '2026-11-26', idempotencyKey: KEY });
    expect(response.status).toBe(400);
    expect(progress.snoozeJob).not.toHaveBeenCalled();
  });
});
