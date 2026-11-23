import type { CompletionRecord } from '@cleaning-planner/contracts/completion';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Membership, MembershipReader } from '../middlewares/membership';
import type { JobHistoryService } from '../services/job-history-service';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';
import { Errors } from '../utils/errors';

const HISTORY_PATH = '/v1/households/home-1/jobs/job-oven/completions';
const SAM_IN_HOME: Membership = { householdId: 'home-1', userId: 'user-sam', role: 'owner' };
const OVEN_DONE: CompletionRecord = {
  jobId: 'job-oven',
  outcome: 'done',
  completedOn: parseCalendarDate('2026-11-20'),
  completedBy: 'user-sam',
  doneAt: '2026-11-20T10:00:00.000Z',
};

const memberships: MembershipReader = {
  findMembership: (householdId, userId) =>
    Promise.resolve(householdId === 'home-1' && userId === 'user-sam' ? SAM_IN_HOME : null),
};

function historyService(
  listHistory: JobHistoryService['listHistory'] = () => Promise.resolve([OVEN_DONE]),
): JobHistoryService {
  return { listHistory: vi.fn(listHistory) };
}

function getAs(history: JobHistoryService, userId: string, path = HISTORY_PATH): request.Test {
  return request(testApp({ history, memberships }))
    .get(path)
    .set(CLAIMS_HEADER, signedInAs(userId));
}

describe('GET /v1/households/:householdId/jobs/:jobId/completions', () => {
  it('gives someone outside the home a 403 and reads nothing', async () => {
    const history = historyService();
    const response = await getAs(history, 'user-stranger');
    expect(response.status).toBe(403);
    expect(history.listHistory).not.toHaveBeenCalled();
  });

  it('lists the job’s done and skipped days', async () => {
    const history = historyService();
    const response = await getAs(history, 'user-sam');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([OVEN_DONE]);
    expect(history.listHistory).toHaveBeenCalledWith('home-1', 'job-oven');
  });

  it('turns away a malformed job id', async () => {
    const history = historyService();
    const response = await getAs(
      history,
      'user-sam',
      '/v1/households/home-1/jobs/bad%20id/completions',
    );
    expect(response.status).toBe(400);
    expect(history.listHistory).not.toHaveBeenCalled();
  });

  it('answers 404 for a job that has gone', async () => {
    const history = historyService(() => Promise.reject(Errors.notFound('No such job')));
    const response = await getAs(history, 'user-sam');
    expect(response.status).toBe(404);
  });
});
