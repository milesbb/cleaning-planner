import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { Job } from '@cleaning-planner/contracts/job';
import { roomSchema } from '@cleaning-planner/contracts/room';
import type { Room, UpdateRoomRequest } from '@cleaning-planner/contracts/room';
import { z } from '@cleaning-planner/contracts/zod';
import type { RoomStore } from '../services/room-service';
import { Errors } from '../utils/errors';
import { deleteInBatches, putInBatches } from './batch-write';
import { homeItems } from './home-items';
import { Keys } from './table';
import type { Table } from './table';
import { deleteItem, transact, updateItem } from './transactions';

const ROOM_CHANGED = 'Someone else changed this room. Reload and try again.';

const storedRoomSchema = z.object(roomSchema.shape);
const storedJobRoomSchema = z.object({ id: z.string(), roomId: z.string() });
const storedKeySchema = z.object({ pk: z.string(), sk: z.string() });

type ItemKey = z.infer<typeof storedKeySchema>;

function roomKey(householdId: string, roomId: string): ItemKey {
  return { pk: Keys.household(householdId), sk: Keys.room(roomId) };
}

async function listRooms(table: Table, householdId: string): Promise<Room[]> {
  const items = await homeItems(table, householdId, { prefix: Keys.roomPrefix });
  return items.map((item) => storedRoomSchema.parse(item));
}

async function requireRoom(table: Table, householdId: string, roomId: string): Promise<Room> {
  const { Item } = await table.client.send(
    new GetCommand({
      TableName: table.name,
      Key: roomKey(householdId, roomId),
      ConsistentRead: true,
    }),
  );
  if (Item === undefined) throw Errors.notFound('No such room');
  return storedRoomSchema.parse(Item);
}

async function addRoom(
  table: Table,
  householdId: string,
  room: Room,
  jobs: readonly Job[],
): Promise<void> {
  const home = Keys.household(householdId);
  await putInBatches(table, [
    ...jobs.map((job) => ({ pk: home, sk: Keys.job(job.id), ...job })),
    { ...roomKey(householdId, room.id), ...room },
  ]);
}

async function updateRoom(
  table: Table,
  householdId: string,
  roomId: string,
  { version, ...changes }: UpdateRoomRequest,
): Promise<Room> {
  await requireRoom(table, householdId, roomId);
  const update = updateItem(table, {
    key: roomKey(householdId, roomId),
    fields: { ...changes, version: version + 1 },
    condition: '#version = :expectedVersion',
    conditionValues: { ':expectedVersion': version },
  });
  await transact(table, [update], ROOM_CHANGED);
  return requireRoom(table, householdId, roomId);
}

async function keysOf(table: Table, householdId: string, prefix: string): Promise<ItemKey[]> {
  const items = await homeItems(table, householdId, { prefix, projection: 'pk, sk' });
  return items.map((item) => storedKeySchema.parse(item));
}

async function jobsAndHistoryOf(
  table: Table,
  householdId: string,
  roomId: string,
): Promise<ItemKey[]> {
  const jobs = await homeItems(table, householdId, {
    prefix: Keys.jobPrefix,
    projection: 'id, roomId',
  });
  const roomJobIds = jobs
    .map((item) => storedJobRoomSchema.parse(item))
    .filter((job) => job.roomId === roomId)
    .map((job) => job.id);
  const history = await Promise.all(
    roomJobIds.map((jobId) => keysOf(table, householdId, Keys.donePrefix(jobId))),
  );
  const home = Keys.household(householdId);
  return [...roomJobIds.map((jobId) => ({ pk: home, sk: Keys.job(jobId) })), ...history.flat()];
}

async function deleteRoom(table: Table, householdId: string, roomId: string): Promise<void> {
  await requireRoom(table, householdId, roomId);
  const jobsAndHistory = await jobsAndHistoryOf(table, householdId, roomId);
  await transact(table, [deleteItem(table, roomKey(householdId, roomId))], ROOM_CHANGED);
  await deleteInBatches(table, jobsAndHistory);
}

export function createRoomRepository(table: Table): RoomStore {
  return {
    listRooms: (householdId) => listRooms(table, householdId),
    addRoom: (householdId, room, jobs) => addRoom(table, householdId, room, jobs),
    updateRoom: (householdId, roomId, changes) => updateRoom(table, householdId, roomId, changes),
    deleteRoom: (householdId, roomId) => deleteRoom(table, householdId, roomId),
  };
}
