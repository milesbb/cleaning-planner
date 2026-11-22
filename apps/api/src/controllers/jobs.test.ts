import type { Job } from '@cleaning-planner/contracts/job';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Membership, MembershipReader } from '../middlewares/membership';
import type { JobService } from '../services/job-service';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';
import { Errors } from '../utils/errors';

const SAM_IN_HOME: Membership = { householdId: 'home-1', userId: 'user-sam', role: 'owner' };
const JOBS_PATH = '/v1/households/home-1/jobs';
const JOB_PATH = `${JOBS_PATH}/job-filter`;

const FILTER_JOB: Job = {
  id: 'job-filter',
  roomId: 'room-kitchen',
  libraryId: 'kitchen.dishwasher-filter',
  name: 'Clean dishwasher filter',
  icon: 'dishwasher',
  schedule: { type: 'floating', every: { value: 1, unit: 'month' } },
  startDate: parseCalendarDate('2026-11-24'),
  assignment: { kind: 'takeTurns' },
  snooze: null,
  effortMinutes: 10,
  version: 1,
};
const CUSTOM_JOB = {
  roomId: 'room-kitchen',
  name: 'Water the plants',
  icon: 'dishwasher',
  schedule: { type: 'fixed', on: { kind: 'weekdays', weekdays: ['monday', 'thursday'] } },
  assignment: { kind: 'anyone' },
  effortMinutes: 5,
};

const memberships: MembershipReader = {
  findMembership: (householdId, userId) =>
    Promise.resolve(householdId === 'home-1' && userId === 'user-sam' ? SAM_IN_HOME : null),
};

function jobService(): JobService {
  return {
    listJobs: vi.fn(() => Promise.resolve([FILTER_JOB])),
    getJob: vi.fn(() => Promise.resolve(FILTER_JOB)),
    addJob: vi.fn(() => Promise.resolve(FILTER_JOB)),
    updateJob: vi.fn(() => Promise.resolve({ ...FILTER_JOB, version: 2 })),
    deleteJob: vi.fn(() => Promise.resolve()),
  };
}

type Method = 'get' | 'post' | 'patch' | 'delete';

function callAs(jobs: JobService, method: Method, path: string, userId: string): request.Test {
  const agent = request(testApp({ jobs, memberships }));
  return agent[method](path).set(CLAIMS_HEADER, signedInAs(userId));
}

const JOB_ROUTES = [
  ['get', JOBS_PATH],
  ['post', JOBS_PATH],
  ['get', JOB_PATH],
  ['patch', JOB_PATH],
  ['delete', JOB_PATH],
] as const;

describe('/v1/households/:householdId/jobs', () => {
  it.each(JOB_ROUTES)(
    'gives someone outside the home a 403 for %s %s and touches nothing',
    async (method, path) => {
      const jobs = jobService();
      const response = await callAs(jobs, method, path, 'user-stranger').send(CUSTOM_JOB);
      expect(response.status).toBe(403);
      for (const operation of Object.values(jobs)) expect(operation).not.toHaveBeenCalled();
    },
  );

  it('lists the home’s jobs and reads one', async () => {
    const jobs = jobService();
    const list = await callAs(jobs, 'get', JOBS_PATH, 'user-sam');
    const one = await callAs(jobs, 'get', JOB_PATH, 'user-sam');
    expect(list.body).toEqual([FILTER_JOB]);
    expect(one.body).toEqual(FILTER_JOB);
    expect(jobs.getJob).toHaveBeenCalledWith('home-1', 'job-filter');
  });

  it('adds a custom job on fixed weekdays and answers 201', async () => {
    const jobs = jobService();
    const response = await callAs(jobs, 'post', JOBS_PATH, 'user-sam').send(CUSTOM_JOB);
    expect(response.status).toBe(201);
    expect(jobs.addJob).toHaveBeenCalledWith('home-1', CUSTOM_JOB);
  });

  it('adds a job from the library', async () => {
    const jobs = jobService();
    const response = await callAs(jobs, 'post', JOBS_PATH, 'user-sam').send({
      ...CUSTOM_JOB,
      libraryId: 'kitchen.dishwasher-filter',
    });
    expect(response.status).toBe(201);
  });

  it.each([
    ['a library id that does not exist', { libraryId: 'kitchen.not-a-job' }],
    [
      'a schedule that never repeats',
      { schedule: { type: 'floating', every: { value: 0, unit: 'day' } } },
    ],
    [
      'a schedule with no weekdays',
      { schedule: { type: 'fixed', on: { kind: 'weekdays', weekdays: [] } } },
    ],
    ['an unknown schedule type', { schedule: { type: 'sometimes' } }],
    ['a due date sent by the client', { nextDue: '2026-11-30' }],
  ])('turns away %s before adding anything', async (_description, change) => {
    const jobs = jobService();
    const response = await callAs(jobs, 'post', JOBS_PATH, 'user-sam').send({
      ...CUSTOM_JOB,
      ...change,
    });
    expect(response.status).toBe(400);
    expect(jobs.addJob).not.toHaveBeenCalled();
  });

  it('changes a job’s schedule', async () => {
    const jobs = jobService();
    const changes = {
      schedule: { type: 'floating', every: { value: 2, unit: 'week' } },
      version: 1,
    };
    const response = await callAs(jobs, 'patch', JOB_PATH, 'user-sam').send(changes);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ version: 2 });
    expect(jobs.updateJob).toHaveBeenCalledWith('home-1', 'job-filter', changes);
  });

  it('turns away a change with nothing in it', async () => {
    const jobs = jobService();
    const response = await callAs(jobs, 'patch', JOB_PATH, 'user-sam').send({ version: 1 });
    expect(response.status).toBe(400);
    expect(jobs.updateJob).not.toHaveBeenCalled();
  });

  it('answers 404 for a job that is not there', async () => {
    const jobs = jobService();
    vi.mocked(jobs.getJob).mockRejectedValue(Errors.notFound('No such job'));
    const response = await callAs(jobs, 'get', JOB_PATH, 'user-sam');
    expect(response.status).toBe(404);
  });

  it('deletes a job and answers 204', async () => {
    const jobs = jobService();
    const response = await callAs(jobs, 'delete', JOB_PATH, 'user-sam');
    expect(response.status).toBe(204);
    expect(jobs.deleteJob).toHaveBeenCalledWith('home-1', 'job-filter');
  });
});
