import type { Household } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import type { Room } from '@cleaning-planner/contracts/room';
import { describe, expect, it, vi } from 'vitest';
import { createRoomService } from './room-service';
import type { RoomStore } from './room-service';

const FLAT: Household = {
  id: 'home-1',
  name: 'Our flat',
  timeZone: 'Pacific/Auckland',
  weekStartsOn: 'monday',
  ownerId: 'user-sam',
  version: 1,
};

function room(id: string, order: number): Room {
  return { id, type: 'bedroom', name: id, order, appliances: [], version: 1 };
}

function serviceWith(
  rooms: Room[],
  household: Household | null = FLAT,
): {
  service: ReturnType<typeof createRoomService>;
  added: { room: Room; jobs: readonly Job[] }[];
  store: RoomStore;
} {
  const added: { room: Room; jobs: readonly Job[] }[] = [];
  let next = 0;
  const store: RoomStore = {
    listRooms: () => Promise.resolve(rooms),
    addRoom: vi.fn((_householdId: string, newRoom: Room, jobs: readonly Job[]) => {
      added.push({ room: newRoom, jobs });
      return Promise.resolve();
    }),
    updateRoom: vi.fn(() => Promise.resolve(room('room-a', 0))),
    deleteRoom: vi.fn(() => Promise.resolve()),
  };
  const service = createRoomService({
    store,
    households: { getHousehold: () => Promise.resolve(household) },
    now: () => '2026-11-23T11:30:00.000Z',
    newId: () => `id-${String((next += 1))}`,
  });
  return { service, added, store };
}

describe('room service', () => {
  it('lists rooms in their order', async () => {
    const { service } = serviceWith([room('second', 1), room('first', 0)]);
    const rooms = await service.listRooms('home-1');
    expect(rooms.map((each) => each.id)).toEqual(['first', 'second']);
  });

  it('adds a room after the others, with its library jobs from today in the home’s time zone', async () => {
    const { service, added } = serviceWith([room('a', 0), room('b', 4)]);
    const created = await service.addRoom('home-1', {
      type: 'kitchen',
      name: 'Kitchen',
      appliances: ['dishwasher'],
    });
    expect(created).toMatchObject({ name: 'Kitchen', order: 5, version: 1 });
    const jobs = added[0]?.jobs ?? [];
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((job) => job.roomId === created.id)).toBe(true);
    expect(jobs.every((job) => job.startDate >= '2026-11-24')).toBe(true);
  });

  it('starts the order at 0 in an empty home', async () => {
    const { service } = serviceWith([]);
    await expect(
      service.addRoom('home-1', { type: 'office', name: 'Study' }),
    ).resolves.toMatchObject({ order: 0 });
  });

  it('says so when the home has gone', async () => {
    const { service } = serviceWith([], null);
    await expect(service.addRoom('home-1', { type: 'office', name: 'Study' })).rejects.toThrow(
      'No such home',
    );
  });

  it('passes updates and deletes to the store', async () => {
    const { service, store } = serviceWith([]);
    await service.updateRoom('home-1', 'room-a', { name: 'Box room', version: 1 });
    await service.deleteRoom('home-1', 'room-a');
    expect(store.updateRoom).toHaveBeenCalledWith('home-1', 'room-a', {
      name: 'Box room',
      version: 1,
    });
    expect(store.deleteRoom).toHaveBeenCalledWith('home-1', 'room-a');
  });
});
