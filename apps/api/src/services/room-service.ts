import type { Job } from '@cleaning-planner/contracts/job';
import type { NewRoom, Room, UpdateRoomRequest } from '@cleaning-planner/contracts/room';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { calendarDateInTimeZone } from '@cleaning-planner/schedule/time-zone';
import { Errors } from '../utils/errors';
import { newRoom, planJobs } from './home-plan';
import type { HouseholdStore } from './household-service';
import type { JobStore } from './job-service';
import { applianceChanges, roomWithItsAppliances } from './room-appliances';

export interface RoomStore {
  listRooms: (householdId: string) => Promise<Room[]>;
  addRoom: (householdId: string, room: Room, jobs: readonly Job[]) => Promise<void>;
  updateRoom: (
    householdId: string,
    roomId: string,
    changes: UpdateRoomRequest,
    jobsToAdd: readonly Job[],
  ) => Promise<Room>;
  deleteRoom: (householdId: string, roomId: string) => Promise<void>;
}

export interface RoomService {
  listRooms: (householdId: string) => Promise<Room[]>;
  addRoom: (householdId: string, room: NewRoom) => Promise<Room>;
  updateRoom: (householdId: string, roomId: string, changes: UpdateRoomRequest) => Promise<Room>;
  deleteRoom: (householdId: string, roomId: string) => Promise<void>;
}

interface RoomServiceDependencies {
  store: RoomStore;
  jobs: Pick<JobStore, 'listJobs' | 'deleteJob'>;
  households: Pick<HouseholdStore, 'getHousehold'>;
  now: () => string;
  newId: () => string;
}

async function todayInHome(
  { households, now }: RoomServiceDependencies,
  householdId: string,
): Promise<CalendarDate> {
  const household = await households.getHousehold(householdId);
  if (household === null) throw Errors.notFound('No such home');
  return calendarDateInTimeZone(now(), household.timeZone);
}

async function addRoom(
  dependencies: RoomServiceDependencies,
  householdId: string,
  request: NewRoom,
): Promise<Room> {
  const { store, newId } = dependencies;
  const today = await todayInHome(dependencies, householdId);
  const rooms = await store.listRooms(householdId);
  const nextOrder = Math.max(-1, ...rooms.map((room) => room.order)) + 1;
  const room = newRoom(request, nextOrder, newId);
  await store.addRoom(householdId, room, planJobs([room], [], today, newId));
  return room;
}

async function listRooms(
  { store, jobs }: RoomServiceDependencies,
  householdId: string,
): Promise<Room[]> {
  const [rooms, homeJobs] = await Promise.all([
    store.listRooms(householdId),
    jobs.listJobs(householdId),
  ]);
  return rooms
    .map((room) => roomWithItsAppliances(room, homeJobs))
    .sort((first, second) => first.order - second.order);
}

type ApplianceUpdate = UpdateRoomRequest & {
  appliances: NonNullable<UpdateRoomRequest['appliances']>;
};

// The room is saved (version-checked) with its new jobs before any job is
// removed, so a stale change removes nothing.
async function changeAppliances(
  dependencies: RoomServiceDependencies,
  householdId: string,
  roomId: string,
  changes: ApplianceUpdate,
): Promise<Room> {
  const { store, jobs, newId } = dependencies;
  const today = await todayInHome(dependencies, householdId);
  const room = (await store.listRooms(householdId)).find((candidate) => candidate.id === roomId);
  if (room === undefined) throw Errors.notFound('No such room');
  const roomJobs = (await jobs.listJobs(householdId)).filter((job) => job.roomId === roomId);
  const requested = changes.appliances;
  const change = applianceChanges({ room, roomJobs, requested, today, newId });
  const saved = await store.updateRoom(householdId, roomId, changes, change.jobsToAdd);
  for (const jobId of change.jobIdsToRemove) await jobs.deleteJob(householdId, jobId);
  const keptJobs = roomJobs.filter((job) => !change.jobIdsToRemove.includes(job.id));
  return roomWithItsAppliances(saved, [...keptJobs, ...change.jobsToAdd]);
}

async function updateRoom(
  dependencies: RoomServiceDependencies,
  householdId: string,
  roomId: string,
  changes: UpdateRoomRequest,
): Promise<Room> {
  const { appliances } = changes;
  if (appliances !== undefined) {
    return changeAppliances(dependencies, householdId, roomId, { ...changes, appliances });
  }
  const saved = await dependencies.store.updateRoom(householdId, roomId, changes, []);
  return roomWithItsAppliances(saved, await dependencies.jobs.listJobs(householdId));
}

export function createRoomService(dependencies: RoomServiceDependencies): RoomService {
  const { store } = dependencies;
  return {
    listRooms: (householdId) => listRooms(dependencies, householdId),
    addRoom: (householdId, room) => addRoom(dependencies, householdId, room),
    updateRoom: (householdId, roomId, changes) =>
      updateRoom(dependencies, householdId, roomId, changes),
    deleteRoom: (householdId, roomId) => store.deleteRoom(householdId, roomId),
  };
}
