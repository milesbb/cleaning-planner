import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Job } from '@cleaning-planner/contracts/job';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createJobRepository } from './job-repository';
import { Keys } from './table';
import { testTable } from './test-table';

const { table, create, remove } = testTable();
const jobs = createJobRepository(table);
const HOME = Keys.household('home-1');

const PLANTS: Job = {
  id: 'job-plants',
  roomId: 'room-lounge',
  libraryId: null,
  name: 'Water the plants',
  icon: 'dishwasher',
  schedule: { type: 'fixed', on: { kind: 'weekdays', weekdays: ['monday', 'thursday'] } },
  startDate: parseCalendarDate('2026-11-24'),
  assignment: { kind: 'anyone' },
  snooze: null,
  effortMinutes: 5,
  version: 1,
};
const FILTER: Job = {
  ...PLANTS,
  id: 'job-filter',
  libraryId: 'kitchen.dishwasher-filter',
  name: 'Clean dishwasher filter',
};

async function historyExists(sk: string): Promise<boolean> {
  const { Item } = await table.client.send(
    new GetCommand({ TableName: table.name, Key: { pk: HOME, sk } }),
  );
  return Item !== undefined;
}

async function putDone(jobId: string): Promise<string> {
  const sk = `${Keys.donePrefix(jobId)}2026-11-20T09:00:00.000Z`;
  await table.client.send(
    new PutCommand({ TableName: table.name, Item: { pk: HOME, sk, doneBy: 'user-sam' } }),
  );
  return sk;
}

beforeAll(async () => {
  await create();
  await jobs.addJob('home-1', PLANTS);
  await jobs.addJob('home-1', FILTER);
});
afterAll(remove);

describe('job repository (DynamoDB Local)', () => {
  it('stores jobs and lists them, with nothing for another home', async () => {
    await expect(jobs.listJobs('home-1')).resolves.toEqual([FILTER, PLANTS]);
    await expect(jobs.listJobs('home-2')).resolves.toEqual([]);
  });

  it('finds one job, or nothing', async () => {
    await expect(jobs.findJob('home-1', 'job-plants')).resolves.toEqual(PLANTS);
    await expect(jobs.findJob('home-1', 'job-missing')).resolves.toBeNull();
  });

  it('refuses a second job with the same id', async () => {
    await expect(jobs.addJob('home-1', PLANTS)).rejects.toThrow('That job already exists');
  });

  it('changes the schedule and assignment and moves the version on', async () => {
    await expect(
      jobs.updateJob('home-1', 'job-plants', {
        schedule: { type: 'floating', every: { value: 3, unit: 'day' } },
        assignment: { kind: 'member', memberId: 'user-alex' },
        version: 1,
      }),
    ).resolves.toEqual({
      ...PLANTS,
      schedule: { type: 'floating', every: { value: 3, unit: 'day' } },
      assignment: { kind: 'member', memberId: 'user-alex' },
      version: 2,
    });
  });

  it('refuses a change made from an old copy', async () => {
    await expect(
      jobs.updateJob('home-1', 'job-plants', { name: 'Mist the ferns', version: 1 }),
    ).rejects.toThrow('Someone else changed this job');
  });

  it('says so when the job does not exist', async () => {
    await expect(
      jobs.updateJob('home-1', 'job-missing', { name: 'Anything', version: 1 }),
    ).rejects.toThrow('No such job');
    await expect(jobs.deleteJob('home-1', 'job-missing')).rejects.toThrow('No such job');
  });

  it('deletes a job and its history, leaving other jobs alone', async () => {
    const plantsHistory = await putDone('job-plants');
    const filterHistory = await putDone('job-filter');

    await jobs.deleteJob('home-1', 'job-plants');

    await expect(jobs.findJob('home-1', 'job-plants')).resolves.toBeNull();
    await expect(historyExists(plantsHistory)).resolves.toBe(false);
    await expect(historyExists(filterHistory)).resolves.toBe(true);
    await expect(jobs.findJob('home-1', 'job-filter')).resolves.toEqual(FILTER);
  });
});
