import { agendaSchema } from '@cleaning-planner/contracts/agenda';
import type { CompletionRecord } from '@cleaning-planner/contracts/completion';
import type { Household, Member } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Membership, MembershipReader } from '../middlewares/membership';
import { createAgendaService } from '../services/agenda-service';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';

const AGENDA_PATH = '/v1/households/home-1/agenda';
const SAM_IN_HOME: Membership = { householdId: 'home-1', userId: 'user-sam', role: 'owner' };
const FLAT: Household = {
  id: 'home-1',
  name: 'Our flat',
  timeZone: 'Europe/London',
  weekStartsOn: 'monday',
  ownerId: 'user-sam',
  version: 1,
};
const MEMBERS: Member[] = [
  { userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'owner' },
  { userId: 'user-alex', name: 'Alex', colour: 'pink', role: 'member' },
];
const BASE_JOB: Job = {
  id: 'job-bins',
  roomId: 'room-1',
  libraryId: null,
  name: 'Bins',
  icon: 'vacuum',
  schedule: { type: 'fixed', on: { kind: 'weekdays', weekdays: ['monday'] } },
  startDate: parseCalendarDate('2026-11-16'),
  assignment: { kind: 'member', memberId: 'user-sam' },
  snooze: null,
  effortMinutes: 5,
  version: 1,
};
const JOBS: Job[] = [
  BASE_JOB,
  {
    ...BASE_JOB,
    id: 'job-bath',
    schedule: { type: 'floating', every: { value: 3, unit: 'day' } },
    assignment: { kind: 'member', memberId: 'user-alex' },
  },
];
const DONE: CompletionRecord[] = [
  {
    jobId: 'job-bath',
    outcome: 'done',
    completedOn: parseCalendarDate('2026-11-21'),
    completedBy: 'user-alex',
    doneAt: '2026-11-21T10:00:00.000Z',
  },
];

const memberships: MembershipReader = {
  findMembership: (householdId, userId) =>
    Promise.resolve(householdId === 'home-1' && userId === 'user-sam' ? SAM_IN_HOME : null),
};

function appAt(now: string): {
  app: ReturnType<typeof testApp>;
  listJobs: ReturnType<typeof vi.fn>;
} {
  const listJobs = vi.fn(() => Promise.resolve(JOBS));
  const agenda = createAgendaService({
    households: { getHousehold: () => Promise.resolve(FLAT) },
    jobs: { listJobs },
    members: { listMembers: () => Promise.resolve(MEMBERS) },
    completions: { listHomeCompletions: () => Promise.resolve(DONE) },
    now: () => now,
  });
  return { app: testApp({ agenda, memberships }), listJobs };
}

function getAgenda(
  app: ReturnType<typeof testApp>,
  query: string,
  userId = 'user-sam',
): request.Test {
  return request(app).get(`${AGENDA_PATH}?${query}`).set(CLAIMS_HEADER, signedInAs(userId));
}

describe('GET /v1/households/:householdId/agenda', () => {
  it('gives someone outside the home a 403 and reads nothing', async () => {
    const { app, listJobs } = appAt('2026-11-23T09:00:00.000Z');
    const response = await getAgenda(app, 'from=2026-11-23&to=2026-11-23', 'user-stranger');
    expect(response.status).toBe(403);
    expect(listJobs).not.toHaveBeenCalled();
  });

  it('draws today, with anything late', async () => {
    const { app } = appAt('2026-11-25T09:00:00.000Z');
    const response = await getAgenda(app, 'from=2026-11-25&to=2026-11-25');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      late: [
        { jobId: 'job-bins', dueDate: '2026-11-16', status: 'late', assignee: 'user-sam' },
        { jobId: 'job-bath', dueDate: '2026-11-24', status: 'late', assignee: 'user-alex' },
      ],
      days: [{ date: '2026-11-25', due: [], done: [] }],
    });
  });

  it('draws a week', async () => {
    const { app } = appAt('2026-11-16T09:00:00.000Z');
    const response = await getAgenda(app, 'from=2026-11-16&to=2026-11-22');
    expect(response.status).toBe(200);
    const { days } = agendaSchema.parse(response.body);
    expect(days).toHaveLength(7);
    expect(days[0]?.due).toEqual([
      { jobId: 'job-bins', dueDate: '2026-11-16', status: 'today', assignee: 'user-sam' },
    ]);
    expect(days[5]?.done).toEqual([
      { jobId: 'job-bath', completedOn: '2026-11-21', completedBy: 'user-alex' },
    ]);
  });

  it('narrows to one person', async () => {
    const { app } = appAt('2026-11-23T09:00:00.000Z');
    const response = await getAgenda(app, 'from=2026-11-23&to=2026-11-29&person=user-alex');
    const { days } = agendaSchema.parse(response.body);
    const dueJobs = days.flatMap((day) => day.due.map((item) => item.jobId));
    expect(dueJobs).toEqual(['job-bath']);
  });

  it.each([
    ['no dates', ''],
    ['an end before the start', 'from=2026-11-23&to=2026-11-22'],
    ['more than 62 days', 'from=2026-11-01&to=2027-01-15'],
    ['a date given twice', 'from=2026-11-23&from=2026-11-24&to=2026-11-25'],
    ['an unknown filter', 'from=2026-11-23&to=2026-11-23&room=room-1'],
  ])('turns away %s', async (_description, query) => {
    const { app, listJobs } = appAt('2026-11-23T09:00:00.000Z');
    const response = await getAgenda(app, query);
    expect(response.status).toBe(400);
    expect(listJobs).not.toHaveBeenCalled();
  });
});
