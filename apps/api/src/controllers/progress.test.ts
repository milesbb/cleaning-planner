import type { CompletionRecord } from '@cleaning-planner/contracts/completion';
import type { Household, Member } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Membership, MembershipReader } from '../middlewares/membership';
import { createAgendaService } from '../services/agenda-service';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';

const PROGRESS_PATH = '/v1/households/home-1/progress';
const SAM_IN_HOME: Membership = { householdId: 'home-1', userId: 'user-sam', role: 'owner' };
const FLAT: Household = {
  id: 'home-1',
  name: 'Our flat',
  timeZone: 'Europe/London',
  weekStartsOn: 'monday',
  ownerId: 'user-sam',
  version: 1,
};
const MEMBERS: Member[] = [{ userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'owner' }];
const OVEN: Job = {
  id: 'job-oven',
  roomId: 'room-kitchen',
  libraryId: null,
  name: 'Clean the oven',
  icon: 'oven',
  schedule: { type: 'floating', every: { value: 3, unit: 'month' } },
  startDate: parseCalendarDate('2026-11-01'),
  assignment: { kind: 'anyone' },
  snooze: null,
  effortMinutes: 30,
  version: 1,
};
const BINS: Job = {
  ...OVEN,
  id: 'job-bins',
  name: 'Bins',
  schedule: { type: 'fixed', on: { kind: 'weekdays', weekdays: ['monday'] } },
  startDate: parseCalendarDate('2026-11-16'),
};
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

function appWithJobs(): { app: ReturnType<typeof testApp>; listJobs: ReturnType<typeof vi.fn> } {
  const listJobs = vi.fn(() => Promise.resolve([OVEN, BINS]));
  const agenda = createAgendaService({
    households: { getHousehold: () => Promise.resolve(FLAT) },
    jobs: { listJobs },
    members: { listMembers: () => Promise.resolve(MEMBERS) },
    completions: { listHomeCompletions: () => Promise.resolve([OVEN_DONE]) },
    now: () => '2026-11-23T09:00:00.000Z',
  });
  return { app: testApp({ agenda, memberships }), listJobs };
}

describe('GET /v1/households/:householdId/progress', () => {
  it('gives someone outside the home a 403 and reads nothing', async () => {
    const { app, listJobs } = appWithJobs();
    const response = await request(app)
      .get(PROGRESS_PATH)
      .set(CLAIMS_HEADER, signedInAs('user-stranger'));
    expect(response.status).toBe(403);
    expect(listJobs).not.toHaveBeenCalled();
  });

  it('gives every job its next due date and latest completion, however far ahead', async () => {
    const { app } = appWithJobs();
    const response = await request(app)
      .get(PROGRESS_PATH)
      .set(CLAIMS_HEADER, signedInAs('user-sam'));
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { jobId: 'job-oven', nextDueDate: '2027-02-20', snooze: null, latestCompletion: OVEN_DONE },
      { jobId: 'job-bins', nextDueDate: '2026-11-16', snooze: null, latestCompletion: null },
    ]);
  });
});
