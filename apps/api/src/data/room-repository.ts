import type { Job } from '@cleaning-planner/contracts/job';
import { roomSchema } from '@cleaning-planner/contracts/room';
import type { Room, UpdateRoomRequest } from '@cleaning-planner/contracts/room';
import { z } from '@cleaning-planner/contracts/zod';
import type { RoomStore } from '../services/room-service';
import { Errors } from '../utils/errors';
import { deleteInBatches, putInBatches } from './batch-write';
import { findHomeItem, homeItemKey, homeItemKeys, homeItems } from './home-items';
import type { ItemKey } from './home-items';
import { Keys } from './table';
import type { Table } from './table';
import { deleteItem, transact, updateIfUnchanged } from './transactions';

const ROOM_CHANGED = 'Someone else changed this room. Reload and try again.';

const storedRoomSchema = z.object(roomSchema.shape);
const storedJobRoomSchema = z.object({ id: z.string(), roomId: z.string() });

async function listRooms(table: Table, householdId: string): Promise<Room[]> {
  const items = await homeItems(table, householdId, { prefix: Keys.roomPrefix });
  return items.map((item) => storedRoomSchema.parse(item));
}

async function requireRoom(table: Table, householdId: string, roomId: string): Promise<Room> {
  const item = await findHomeItem(table, householdId, Keys.room(roomId));
  if (item === undefined) throw Errors.notFound('No such room');
  return storedRoomSchema.parse(item);
}

async function addRoom(
  table: Table,
  householdId: string,
  room: Room,
  jobs: readonly Job[],
): Promise<void> {
  await putInBatches(table, [
    ...jobs.map((job) => ({ ...homeItemKey(householdId, Keys.job(job.id)), ...job })),
    { ...homeItemKey(householdId, Keys.room(room.id)), ...room },
  ]);
}

async function updateRoom(
  table: Table,
  householdId: string,
  roomId: string,
  changes: UpdateRoomRequest,
): Promise<Room> {
  await requireRoom(table, householdId, roomId);
  await updateIfUnchanged(table, {
    key: homeItemKey(householdId, Keys.room(roomId)),
    changes,
    conflictMessage: ROOM_CHANGED,
  });
  return requireRoom(table, householdId, roomId);
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
    roomJobIds.map((jobId) => homeItemKeys(table, householdId, Keys.donePrefix(jobId))),
  );
  return [
    ...roomJobIds.map((jobId) => homeItemKey(householdId, Keys.job(jobId))),
    ...history.flat(),
  ];
}

async function deleteRoom(table: Table, householdId: string, roomId: string): Promise<void> {
  await requireRoom(table, householdId, roomId);
  const jobsAndHistory = await jobsAndHistoryOf(table, householdId, roomId);
  await transact(
    table,
    [deleteItem(table, homeItemKey(householdId, Keys.room(roomId)))],
    ROOM_CHANGED,
  );
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
