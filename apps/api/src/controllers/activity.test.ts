import type { ActivityEntry } from '@cleaning-planner/contracts/activity';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Membership, MembershipReader } from '../middlewares/membership';
import type { ActivityService } from '../services/activity-service';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';

const ACTIVITY_PATH = '/v1/households/home-1/activity';
const SAM_IN_HOME: Membership = { householdId: 'home-1', userId: 'user-sam', role: 'member' };
const OVEN_DONE: ActivityEntry = {
  jobId: 'job-oven',
  jobName: 'Clean the oven',
  outcome: 'done',
  completedOn: parseCalendarDate('2026-11-20'),
  completedBy: 'user-sam',
  doneAt: '2026-11-20T10:00:00.000Z',
};

const memberships: MembershipReader = {
  findMembership: (householdId, userId) =>
    Promise.resolve(householdId === 'home-1' && userId === 'user-sam' ? SAM_IN_HOME : null),
};

function activityService(): ActivityService {
  return { listActivity: vi.fn(() => Promise.resolve([OVEN_DONE])) };
}

function getAs(activity: ActivityService, userId: string, path = ACTIVITY_PATH): request.Test {
  return request(testApp({ activity, memberships }))
    .get(path)
    .set(CLAIMS_HEADER, signedInAs(userId));
}

describe('GET /v1/households/:householdId/activity', () => {
  it('gives someone outside the home a 403 and reads nothing', async () => {
    const activity = activityService();
    const response = await getAs(activity, 'user-stranger');
    expect(response.status).toBe(403);
    expect(activity.listActivity).not.toHaveBeenCalled();
  });

  it('lists the home’s recent activity', async () => {
    const activity = activityService();
    const response = await getAs(activity, 'user-sam', `${ACTIVITY_PATH}?limit=5`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([OVEN_DONE]);
    expect(activity.listActivity).toHaveBeenCalledWith('home-1', { limit: '5' });
  });

  it.each(['0', '51', 'lots'])('turns away a limit of %s', async (limit) => {
    const activity = activityService();
    const response = await getAs(activity, 'user-sam', `${ACTIVITY_PATH}?limit=${limit}`);
    expect(response.status).toBe(400);
    expect(activity.listActivity).not.toHaveBeenCalled();
  });
});
