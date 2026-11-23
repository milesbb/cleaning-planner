import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { ActivityEntry } from '@cleaning-planner/contracts/activity';
import type { CompletionRecord, JobProgress } from '@cleaning-planner/contracts/completion';
import type { Job } from '@cleaning-planner/contracts/job';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RequestRecord } from '../services/job-progress-service';
import { createJobRepository } from './job-repository';
import { createProgressRepository } from './progress-repository';
import { Keys } from './table';
import { testTable } from './test-table';

const { table, create, remove } = testTable();
const progress = createProgressRepository(table);
const jobs = createJobRepository(table);

const VACUUM: Job = {
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
  version: 1,
};
const DONE_MONDAY: CompletionRecord = {
  jobId: 'job-vacuum',
  outcome: 'done',
  completedOn: parseCalendarDate('2026-11-23'),
  completedBy: 'user-sam',
  doneAt: '2026-11-23T08:00:00.000Z',
};
const RESULT: JobProgress = {
  jobId: 'job-vacuum',
  nextDueDate: parseCalendarDate('2026-11-30'),
  snooze: null,
  latestCompletion: DONE_MONDAY,
};

function entryOf(completion: CompletionRecord, jobName = 'Vacuum'): ActivityEntry {
  return { ...completion, jobName };
}

function requestRecord(key: string, result: JobProgress = RESULT): RequestRecord {
  return { userId: 'user-sam', key, result, expiresAt: '2026-11-24T08:00:00.000Z' };
}

function ref(key: string): { householdId: string; userId: string; key: string } {
  return { householdId: 'home-1', userId: 'user-sam', key };
}

beforeAll(async () => {
  await create();
  await jobs.addJob('home-1', VACUUM);
});
afterAll(remove);

describe('progress repository (DynamoDB Local)', () => {
  it('records a completion and remembers the answer for the request', async () => {
    await progress.addCompletion(
      'home-1',
      entryOf(DONE_MONDAY),
      requestRecord('request-key-000000001'),
    );
    await expect(progress.listCompletions('home-1', 'job-vacuum')).resolves.toEqual([DONE_MONDAY]);
    await expect(progress.findResult(ref('request-key-000000001'))).resolves.toEqual(RESULT);
  });

  it('keeps the request’s expiry in seconds so DynamoDB can remove it with TTL', async () => {
    const { Item } = await table.client.send(
      new GetCommand({
        TableName: table.name,
        Key: {
          pk: Keys.household('home-1'),
          sk: Keys.request('user-sam', 'request-key-000000001'),
        },
      }),
    );
    expect(Item?.expiresAt).toBe(Date.parse('2026-11-24T08:00:00.000Z') / 1000);
  });

  it('refuses to save the same request twice', async () => {
    await expect(
      progress.addCompletion(
        'home-1',
        entryOf({ ...DONE_MONDAY, doneAt: '2026-11-23T08:00:01.000Z' }),
        requestRecord('request-key-000000001'),
      ),
    ).rejects.toThrow('That was already saved');
    await expect(progress.listCompletions('home-1', 'job-vacuum')).resolves.toHaveLength(1);
  });

  it('finds nothing for a request it has not seen, or someone else’s', async () => {
    await expect(progress.findResult(ref('request-key-000000099'))).resolves.toBeNull();
    await expect(
      progress.findResult({ ...ref('request-key-000000001'), userId: 'user-alex' }),
    ).resolves.toBeNull();
  });

  it('removes a completion when undone', async () => {
    await progress.removeCompletion('home-1', DONE_MONDAY, requestRecord('request-key-000000002'));
    await expect(progress.listCompletions('home-1', 'job-vacuum')).resolves.toEqual([]);
  });

  it('snoozes a job and moves its version on', async () => {
    const snooze = {
      from: parseCalendarDate('2026-11-23'),
      until: parseCalendarDate('2026-11-26'),
    };
    await progress.snoozeJob('home-1', VACUUM, snooze, requestRecord('request-key-000000003'));
    await expect(jobs.findJob('home-1', 'job-vacuum')).resolves.toMatchObject({
      snooze,
      version: 2,
    });
  });

  it('refuses a snooze based on an old copy of the job', async () => {
    const snooze = {
      from: parseCalendarDate('2026-11-23'),
      until: parseCalendarDate('2026-11-27'),
    };
    await expect(
      progress.snoozeJob('home-1', VACUUM, snooze, requestRecord('request-key-000000004')),
    ).rejects.toThrow('Someone else changed this job');
  });

  it('lists every job’s completions for the agenda, and only this home’s', async () => {
    const bins = { ...DONE_MONDAY, jobId: 'job-bins', doneAt: '2026-11-23T09:00:00.000Z' };
    await progress.addCompletion(
      'home-1',
      entryOf(DONE_MONDAY),
      requestRecord('request-key-000000005'),
    );
    await progress.addCompletion(
      'home-1',
      entryOf(bins, 'Empty the bins'),
      requestRecord('request-key-000000006'),
    );
    await progress.addCompletion(
      'home-2',
      entryOf(bins, 'Empty the bins'),
      requestRecord('request-key-000000007'),
    );
    await expect(progress.listHomeCompletions('home-1')).resolves.toEqual([bins, DONE_MONDAY]);
  });
});

describe('home activity (DynamoDB Local)', () => {
  const HOME = 'home-activity';

  function doneAt(hour: number, jobId = 'job-vacuum'): CompletionRecord {
    const time = `2026-11-23T${String(hour).padStart(2, '0')}:00:00.000Z`;
    return { ...DONE_MONDAY, jobId, doneAt: time };
  }

  it('keeps an entry with the job’s name for every completion', async () => {
    await progress.addCompletion(HOME, entryOf(doneAt(8)), requestRecord('activity-key-00000001'));
    await expect(progress.listActivity(HOME, 20)).resolves.toEqual([entryOf(doneAt(8))]);
    await expect(progress.listCompletions(HOME, 'job-vacuum')).resolves.toEqual([doneAt(8)]);
  });

  it('lists the newest first, at most the limit, and only this home’s', async () => {
    await progress.addCompletion(
      HOME,
      entryOf(doneAt(10, 'job-bins'), 'Empty the bins'),
      requestRecord('activity-key-00000002'),
    );
    await progress.addCompletion(HOME, entryOf(doneAt(9)), requestRecord('activity-key-00000003'));
    await progress.addCompletion(
      'home-elsewhere',
      entryOf(doneAt(11)),
      requestRecord('activity-key-00000004'),
    );
    const latest = await progress.listActivity(HOME, 2);
    expect(latest.map((entry) => entry.doneAt)).toEqual([doneAt(10).doneAt, doneAt(9).doneAt]);
  });

  it('forgets the entry when the completion is undone', async () => {
    await progress.removeCompletion(HOME, doneAt(9), requestRecord('activity-key-00000005'));
    const activity = await progress.listActivity(HOME, 20);
    expect(activity.map((entry) => entry.doneAt)).toEqual([doneAt(10).doneAt, doneAt(8).doneAt]);
  });

  it('still names a job after it has been removed', async () => {
    await jobs.addJob(HOME, { ...VACUUM, id: 'job-bins', name: 'Empty the bins' });
    await jobs.deleteJob(HOME, 'job-bins');
    const [newest] = await progress.listActivity(HOME, 1);
    expect(newest).toMatchObject({ jobId: 'job-bins', jobName: 'Empty the bins' });
  });

  it('can undo a completion saved before activity entries existed', async () => {
    const older = doneAt(7);
    await table.client.send(
      new PutCommand({
        TableName: table.name,
        Item: { pk: Keys.household(HOME), sk: Keys.done(older.jobId, older.doneAt), ...older },
      }),
    );
    await expect(
      progress.removeCompletion(HOME, older, requestRecord('activity-key-00000006')),
    ).resolves.toBeUndefined();
  });
});
