import type { CompletionRecord } from '@cleaning-planner/contracts/completion';
import type { Household, Member } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { createAgendaService } from './agenda-service';

const FLAT: Household = {
  id: 'home-1',
  name: 'Our flat',
  timeZone: 'Pacific/Auckland',
  weekStartsOn: 'monday',
  ownerId: 'user-sam',
  version: 1,
};
const MEMBERS: Member[] = [
  { userId: 'user-alex', name: 'Alex', colour: 'pink', role: 'member' },
  { userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'owner' },
];

function job(id: string, overrides: Partial<Job> = {}): Job {
  return {
    id,
    roomId: 'room-1',
    libraryId: null,
    name: id,
    icon: 'vacuum',
    schedule: { type: 'floating', every: { value: 1, unit: 'week' } },
    startDate: parseCalendarDate('2026-11-24'),
    assignment: { kind: 'anyone' },
    snooze: null,
    effortMinutes: 10,
    version: 1,
    ...overrides,
  };
}

const JOBS: Job[] = [
  job('job-bins', { assignment: { kind: 'member', memberId: 'user-sam' } }),
  job('job-floors', { startDate: parseCalendarDate('2026-11-20') }),
  job('job-towels', {
    assignment: { kind: 'member', memberId: 'user-alex' },
    snooze: { from: parseCalendarDate('2026-11-24'), until: parseCalendarDate('2026-11-27') },
  }),
];
const DONE_FLOORS: CompletionRecord = {
  jobId: 'job-floors',
  outcome: 'done',
  completedOn: parseCalendarDate('2026-11-22'),
  completedBy: 'user-alex',
  doneAt: '2026-11-22T01:00:00.000Z',
};

function serviceWith(household: Household | null = FLAT): ReturnType<typeof createAgendaService> {
  return createAgendaService({
    households: { getHousehold: () => Promise.resolve(household) },
    jobs: { listJobs: () => Promise.resolve(JOBS) },
    members: { listMembers: () => Promise.resolve(MEMBERS) },
    completions: { listHomeCompletions: () => Promise.resolve([DONE_FLOORS]) },
    now: () => '2026-11-23T20:00:00.000Z',
  });
}

describe('agenda service', () => {
  it('shows today in the home’s time zone', async () => {
    const agenda = await serviceWith().getAgenda('home-1', {
      from: parseCalendarDate('2026-11-24'),
      to: parseCalendarDate('2026-11-24'),
    });
    expect(agenda.late).toEqual([]);
    expect(agenda.days).toEqual([
      {
        date: '2026-11-24',
        due: [{ jobId: 'job-bins', dueDate: '2026-11-24', status: 'today', assignee: 'user-sam' }],
        done: [],
      },
    ]);
  });

  it('lays out a week, with snoozes, history and done items', async () => {
    const agenda = await serviceWith().getAgenda('home-1', {
      from: parseCalendarDate('2026-11-22'),
      to: parseCalendarDate('2026-11-29'),
    });
    const dueByDay = agenda.days.map((day) => [day.date, day.due.map((item) => item.jobId)]);
    expect(dueByDay).toContainEqual(['2026-11-27', ['job-towels']]);
    expect(dueByDay).toContainEqual(['2026-11-29', ['job-floors']]);
    expect(agenda.days[0]?.done).toEqual([
      { jobId: 'job-floors', completedOn: '2026-11-22', completedBy: 'user-alex' },
    ]);
  });

  it('narrows to one person’s jobs and jobs anyone can do', async () => {
    const agenda = await serviceWith().getAgenda('home-1', {
      from: parseCalendarDate('2026-11-24'),
      to: parseCalendarDate('2026-11-30'),
      person: 'user-alex',
    });
    const jobIds = agenda.days.flatMap((day) => day.due.map((item) => item.jobId));
    expect(jobIds).toEqual(['job-towels', 'job-floors']);
  });

  it('refuses a person who does not live here', async () => {
    await expect(
      serviceWith().getAgenda('home-1', {
        from: parseCalendarDate('2026-11-24'),
        to: parseCalendarDate('2026-11-24'),
        person: 'user-stranger',
      }),
    ).rejects.toMatchObject({ statusCode: 400, fields: { person: 'Pick someone who lives here' } });
  });

  it('says so when the home has gone', async () => {
    await expect(
      serviceWith(null).getAgenda('home-1', {
        from: parseCalendarDate('2026-11-24'),
        to: parseCalendarDate('2026-11-24'),
      }),
    ).rejects.toThrow('No such home');
  });
});
