import type { Job } from '@cleaning-planner/contracts/job';
import type { NewRoom, Room, UpdateRoomRequest } from '@cleaning-planner/contracts/room';
import { calendarDateInTimeZone } from '@cleaning-planner/schedule/time-zone';
import { Errors } from '../utils/errors';
import { newRoom, planJobs } from './home-plan';
import type { HouseholdStore } from './household-service';

export interface RoomStore {
  listRooms: (householdId: string) => Promise<Room[]>;
  addRoom: (householdId: string, room: Room, jobs: readonly Job[]) => Promise<void>;
  updateRoom: (householdId: string, roomId: string, changes: UpdateRoomRequest) => Promise<Room>;
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
  households: Pick<HouseholdStore, 'getHousehold'>;
  now: () => string;
  newId: () => string;
}

async function addRoom(
  { store, households, now, newId }: RoomServiceDependencies,
  householdId: string,
  request: NewRoom,
): Promise<Room> {
  const household = await households.getHousehold(householdId);
  if (household === null) throw Errors.notFound('No such home');
  const rooms = await store.listRooms(householdId);
  const nextOrder = Math.max(-1, ...rooms.map((room) => room.order)) + 1;
  const room = newRoom(request, nextOrder, newId);
  const today = calendarDateInTimeZone(now(), household.timeZone);
  await store.addRoom(householdId, room, planJobs([room], [], today, newId));
  return room;
}

export function createRoomService(dependencies: RoomServiceDependencies): RoomService {
  const { store } = dependencies;
  return {
    listRooms: async (householdId): Promise<Room[]> =>
      [...(await store.listRooms(householdId))].sort((first, second) => first.order - second.order),
    addRoom: (householdId, room) => addRoom(dependencies, householdId, room),
    updateRoom: (householdId, roomId, changes) => store.updateRoom(householdId, roomId, changes),
    deleteRoom: (householdId, roomId) => store.deleteRoom(householdId, roomId),
  };
}
