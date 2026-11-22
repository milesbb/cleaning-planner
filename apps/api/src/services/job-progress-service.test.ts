import type { CompletionRecord, JobProgress } from '@cleaning-planner/contracts/completion';
import type { Household } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it, vi } from 'vitest';
import type { Membership } from '../middlewares/membership';
import { Errors } from '../utils/errors';
import { createJobProgressService } from './job-progress-service';
import type { ProgressStore, RequestRecord } from './job-progress-service';

const NOW = '2026-11-23T08:00:00.000Z';
const TODAY = '2026-11-23';
const KEY = 'request-key-000000001';
const SAM: Membership = { householdId: 'home-1', userId: 'user-sam', role: 'owner' };
const ALEX: Membership = { householdId: 'home-1', userId: 'user-alex', role: 'member' };
const FLAT: Household = {
  id: 'home-1',
  name: 'Our flat',
  timeZone: 'Europe/London',
  weekStartsOn: 'monday',
  ownerId: 'user-sam',
  version: 1,
};
const WEEKLY_VACUUM: Job = {
  id: 'job-vacuum',
  roomId: 'room-lounge',
  libraryId: null,
  name: 'Vacuum',
  icon: 'vacuum',
  schedule: { type: 'floating', every: { value: 1, unit: 'week' } },
  startDate: parseCalendarDate('2026-11-20'),
  assignment: { kind: 'anyone' },
  snooze: null,
  effortMinutes: 15,
  version: 3,
};

function completion(overrides: Partial<CompletionRecord> = {}): CompletionRecord {
  return {
    jobId: 'job-vacuum',
    outcome: 'done',
    completedOn: parseCalendarDate('2026-11-16'),
    completedBy: 'user-sam',
    doneAt: '2026-11-16T09:00:00.000Z',
    ...overrides,
  };
}

interface Fakes {
  store: ProgressStore;
  remembered: RequestRecord[];
}

function serviceWith(
  history: CompletionRecord[] = [],
  job: Job | null = WEEKLY_VACUUM,
): { service: ReturnType<typeof createJobProgressService>; fakes: Fakes } {
  const remembered: RequestRecord[] = [];
  const remember = (
    _householdId: string,
    _change: unknown,
    request: RequestRecord,
  ): Promise<void> => {
    remembered.push(request);
    return Promise.resolve();
  };
  const store: ProgressStore = {
    listCompletions: vi.fn(() => Promise.resolve(history)),
    addCompletion: vi.fn(remember),
    removeCompletion: vi.fn(remember),
    snoozeJob: vi.fn((householdId: string, _job: Job, snooze: unknown, request: RequestRecord) =>
      remember(householdId, snooze, request),
    ),
    findResult: vi.fn(({ key }: { key: string }) =>
      Promise.resolve(remembered.find((request) => request.key === key)?.result ?? null),
    ),
  };
  const service = createJobProgressService({
    store,
    jobs: { findJob: () => Promise.resolve(job) },
    households: { getHousehold: () => Promise.resolve(FLAT) },
    now: () => NOW,
  });
  return { service, fakes: { store, remembered } };
}

describe('ticking a job off', () => {
  it('records who did it and moves the next due date on from that day', async () => {
    const { service, fakes } = serviceWith([completion()]);
    const progress = await service.completeJob(SAM, 'job-vacuum', {
      outcome: 'done',
      completedOn: parseCalendarDate(TODAY),
      idempotencyKey: KEY,
    });
    expect(progress).toEqual({
      jobId: 'job-vacuum',
      nextDueDate: '2026-11-30',
      snooze: null,
      latestCompletion: {
        jobId: 'job-vacuum',
        outcome: 'done',
        completedOn: TODAY,
        completedBy: 'user-sam',
        doneAt: NOW,
      },
    });
    expect(fakes.store.addCompletion).toHaveBeenCalledWith('home-1', progress.latestCompletion, {
      userId: 'user-sam',
      key: KEY,
      result: progress,
      expiresAt: '2026-11-24T08:00:00.000Z',
    });
  });

  it('moves the job on the same way when it is skipped', async () => {
    const { service } = serviceWith();
    await expect(
      service.completeJob(ALEX, 'job-vacuum', {
        outcome: 'skipped',
        completedOn: parseCalendarDate('2026-11-21'),
        idempotencyKey: KEY,
      }),
    ).resolves.toMatchObject({
      nextDueDate: '2026-11-28',
      latestCompletion: { outcome: 'skipped' },
    });
  });

  it('refuses a day that has not happened yet in the home’s time zone', async () => {
    const { service, fakes } = serviceWith();
    await expect(
      service.completeJob(SAM, 'job-vacuum', {
        outcome: 'done',
        completedOn: parseCalendarDate('2026-11-24'),
        idempotencyKey: KEY,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      fields: { completedOn: 'Pick today or an earlier day' },
    });
    expect(fakes.store.addCompletion).not.toHaveBeenCalled();
  });

  it('says so when the job has gone', async () => {
    const { service } = serviceWith([], null);
    await expect(
      service.completeJob(SAM, 'job-vacuum', {
        outcome: 'done',
        completedOn: parseCalendarDate(TODAY),
        idempotencyKey: KEY,
      }),
    ).rejects.toThrow('No such job');
  });
});

describe('repeated requests', () => {
  it('returns the first answer without writing again', async () => {
    const { service, fakes } = serviceWith();
    const request = {
      outcome: 'done' as const,
      completedOn: parseCalendarDate(TODAY),
      idempotencyKey: KEY,
    };
    const first = await service.completeJob(SAM, 'job-vacuum', request);
    const second = await service.completeJob(SAM, 'job-vacuum', request);
    expect(second).toEqual(first);
    expect(fakes.store.addCompletion).toHaveBeenCalledTimes(1);
  });

  it('returns the other answer when two copies of a request race', async () => {
    const { service, fakes } = serviceWith();
    const earlier: JobProgress = {
      jobId: 'job-vacuum',
      nextDueDate: parseCalendarDate('2026-11-30'),
      snooze: null,
      latestCompletion: null,
    };
    vi.mocked(fakes.store.findResult).mockResolvedValueOnce(null).mockResolvedValueOnce(earlier);
    vi.mocked(fakes.store.addCompletion).mockRejectedValue(Errors.conflict('Already done'));
    await expect(
      service.completeJob(SAM, 'job-vacuum', {
        outcome: 'done',
        completedOn: parseCalendarDate(TODAY),
        idempotencyKey: KEY,
      }),
    ).resolves.toEqual(earlier);
  });

  it('still fails when a write fails for another reason', async () => {
    const { service, fakes } = serviceWith();
    vi.mocked(fakes.store.addCompletion).mockRejectedValue(new Error('DynamoDB is down'));
    await expect(
      service.completeJob(SAM, 'job-vacuum', {
        outcome: 'done',
        completedOn: parseCalendarDate(TODAY),
        idempotencyKey: KEY,
      }),
    ).rejects.toThrow('DynamoDB is down');
  });
});

describe('undoing a tick', () => {
  const justNow = completion({
    completedOn: parseCalendarDate(TODAY),
    doneAt: '2026-11-23T07:50:00.000Z',
  });

  it('removes your own latest completion and puts the due date back', async () => {
    const { service, fakes } = serviceWith([completion(), justNow]);
    const progress = await service.undoLatest(SAM, 'job-vacuum', { idempotencyKey: KEY });
    expect(progress).toEqual({
      jobId: 'job-vacuum',
      nextDueDate: '2026-11-23',
      snooze: null,
      latestCompletion: completion(),
    });
    expect(fakes.store.removeCompletion).toHaveBeenCalledWith('home-1', justNow, expect.anything());
  });

  it('will not undo someone else’s tick', async () => {
    const { service, fakes } = serviceWith([justNow]);
    await expect(
      service.undoLatest(ALEX, 'job-vacuum', { idempotencyKey: KEY }),
    ).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(fakes.store.removeCompletion).not.toHaveBeenCalled();
  });

  it('will not undo a tick from too long ago', async () => {
    const { service } = serviceWith([completion({ doneAt: '2026-11-23T07:29:00.000Z' })]);
    await expect(
      service.undoLatest(SAM, 'job-vacuum', { idempotencyKey: KEY }),
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('says when there is nothing to undo', async () => {
    const { service } = serviceWith([]);
    await expect(
      service.undoLatest(SAM, 'job-vacuum', { idempotencyKey: KEY }),
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('snoozing a job', () => {
  it('moves the due date to the chosen day and bumps the job', async () => {
    const { service, fakes } = serviceWith([completion()]);
    const progress = await service.snoozeJob(SAM, 'job-vacuum', {
      until: parseCalendarDate('2026-11-26'),
      idempotencyKey: KEY,
    });
    expect(progress).toEqual({
      jobId: 'job-vacuum',
      nextDueDate: '2026-11-26',
      snooze: { from: '2026-11-23', until: '2026-11-26' },
      latestCompletion: completion(),
    });
    expect(fakes.store.snoozeJob).toHaveBeenCalledWith(
      'home-1',
      WEEKLY_VACUUM,
      { from: '2026-11-23', until: '2026-11-26' },
      expect.objectContaining({ key: KEY }),
    );
  });

  it('can move an existing snooze from the original due date', async () => {
    const snoozed = {
      ...WEEKLY_VACUUM,
      snooze: { from: parseCalendarDate('2026-11-23'), until: parseCalendarDate('2026-11-26') },
    };
    const { service } = serviceWith([completion()], snoozed);
    await expect(
      service.snoozeJob(SAM, 'job-vacuum', {
        until: parseCalendarDate('2026-11-25'),
        idempotencyKey: KEY,
      }),
    ).resolves.toMatchObject({ nextDueDate: '2026-11-25', snooze: { from: '2026-11-23' } });
  });

  it.each([
    ['today', TODAY, 'Snooze to a later day'],
    ['before it is due', '2026-11-22', 'Snooze to a later day'],
    ['more than a year away', '2027-11-24', 'Snooze for a year at most'],
  ])('refuses a day %s', async (_description, until, message) => {
    const { service, fakes } = serviceWith([completion()]);
    await expect(
      service.snoozeJob(SAM, 'job-vacuum', {
        until: parseCalendarDate(until),
        idempotencyKey: KEY,
      }),
    ).rejects.toMatchObject({ statusCode: 400, fields: { until: message } });
    expect(fakes.store.snoozeJob).not.toHaveBeenCalled();
  });

  it('stops reporting a snooze once the job has been done', async () => {
    const snoozed = {
      ...WEEKLY_VACUUM,
      snooze: { from: parseCalendarDate('2026-11-23'), until: parseCalendarDate('2026-11-26') },
    };
    const { service } = serviceWith([completion()], snoozed);
    await expect(
      service.completeJob(SAM, 'job-vacuum', {
        outcome: 'done',
        completedOn: parseCalendarDate(TODAY),
        idempotencyKey: KEY,
      }),
    ).resolves.toMatchObject({ nextDueDate: '2026-11-30', snooze: null });
  });
});
