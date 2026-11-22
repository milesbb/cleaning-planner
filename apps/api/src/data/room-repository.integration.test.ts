import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Job } from '@cleaning-planner/contracts/job';
import type { Room } from '@cleaning-planner/contracts/room';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { planJobs } from '../services/home-plan';
import { createRoomRepository } from './room-repository';
import { Keys } from './table';
import { testTable } from './test-table';

const { table, create, remove } = testTable();
const rooms = createRoomRepository(table);
const HOME = Keys.household('home-1');
const FIRST_DAY = parseCalendarDate('2026-11-23');

const KITCHEN: Room = {
  id: 'room-kitchen',
  type: 'kitchen',
  name: 'Kitchen',
  order: 0,
  appliances: ['dishwasher'],
  version: 1,
};
const STUDY: Room = {
  id: 'room-study',
  type: 'office',
  name: 'Study',
  order: 1,
  appliances: [],
  version: 1,
};

let nextId = 0;
function newId(): string {
  nextId += 1;
  return `id-${String(nextId)}`;
}

async function itemExists(sk: string): Promise<boolean> {
  const { Item } = await table.client.send(
    new GetCommand({ TableName: table.name, Key: { pk: HOME, sk } }),
  );
  return Item !== undefined;
}

async function putDone(jobId: string, doneAt: string): Promise<string> {
  const sk = `${Keys.donePrefix(jobId)}${doneAt}`;
  await table.client.send(
    new PutCommand({ TableName: table.name, Item: { pk: HOME, sk, doneBy: 'user-sam' } }),
  );
  return sk;
}

const kitchenJobs: Job[] = planJobs([KITCHEN], [], FIRST_DAY, newId);
const studyJobs: Job[] = planJobs([STUDY], [], FIRST_DAY, newId);

beforeAll(async () => {
  await create();
  await rooms.addRoom('home-1', KITCHEN, kitchenJobs);
  await rooms.addRoom('home-1', STUDY, studyJobs);
});
afterAll(remove);

describe('room repository (DynamoDB Local)', () => {
  it('stores rooms with their jobs and lists them', async () => {
    await expect(rooms.listRooms('home-1')).resolves.toEqual([KITCHEN, STUDY]);
    expect(kitchenJobs.length).toBeGreaterThan(0);
    await expect(itemExists(Keys.job(kitchenJobs[0]?.id ?? ''))).resolves.toBe(true);
  });

  it('lists nothing for another home', async () => {
    await expect(rooms.listRooms('home-2')).resolves.toEqual([]);
  });

  it('changes a room and moves its version on', async () => {
    await expect(
      rooms.updateRoom('home-1', 'room-study', { name: 'Office', version: 1 }),
    ).resolves.toEqual({ ...STUDY, name: 'Office', version: 2 });
  });

  it('refuses a change made from an old copy', async () => {
    await expect(
      rooms.updateRoom('home-1', 'room-study', { name: 'Den', version: 1 }),
    ).rejects.toThrow('Someone else changed this room');
  });

  it('says so when the room does not exist', async () => {
    await expect(
      rooms.updateRoom('home-1', 'room-missing', { name: 'Den', version: 1 }),
    ).rejects.toThrow('No such room');
    await expect(rooms.deleteRoom('home-1', 'room-missing')).rejects.toThrow('No such room');
  });

  it('deletes a room with its jobs and their history, leaving other rooms alone', async () => {
    const kitchenJobId = kitchenJobs[0]?.id ?? '';
    const studyJobId = studyJobs[0]?.id ?? '';
    const kitchenHistory = await putDone(kitchenJobId, '2026-11-20T09:00:00.000Z');
    const studyHistory = await putDone(studyJobId, '2026-11-20T09:00:00.000Z');

    await rooms.deleteRoom('home-1', 'room-kitchen');

    await expect(itemExists(Keys.room('room-kitchen'))).resolves.toBe(false);
    await expect(itemExists(Keys.job(kitchenJobId))).resolves.toBe(false);
    await expect(itemExists(kitchenHistory)).resolves.toBe(false);
    await expect(itemExists(Keys.job(studyJobId))).resolves.toBe(true);
    await expect(itemExists(studyHistory)).resolves.toBe(true);
    await expect(rooms.listRooms('home-1')).resolves.toMatchObject([{ id: 'room-study' }]);
  });
});
