import type { Household } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import type { Room } from '@cleaning-planner/contracts/room';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
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

const KITCHEN: Room = { ...room('room-kitchen', 0), type: 'kitchen', name: 'Kitchen' };

function job(id: string, libraryId: string | null, roomId = 'room-kitchen'): Job {
  return {
    id,
    roomId,
    libraryId,
    name: id,
    icon: 'oven',
    schedule: { type: 'floating', every: { value: 1, unit: 'week' } },
    startDate: parseCalendarDate('2026-11-01'),
    assignment: { kind: 'anyone' },
    snooze: null,
    effortMinutes: 10,
    version: 1,
  };
}

function serviceWith(
  rooms: Room[],
  household: Household | null = FLAT,
  jobs: Job[] = [],
): {
  service: ReturnType<typeof createRoomService>;
  added: { room: Room; jobs: readonly Job[] }[];
  store: RoomStore;
  deleteJob: ReturnType<typeof vi.fn>;
} {
  const added: { room: Room; jobs: readonly Job[] }[] = [];
  let next = 0;
  const store: RoomStore = {
    listRooms: () => Promise.resolve(rooms),
    addRoom: vi.fn((_householdId: string, newRoom: Room, jobs: readonly Job[]) => {
      added.push({ room: newRoom, jobs });
      return Promise.resolve();
    }),
    updateRoom: vi.fn((_householdId: string, roomId: string, changes: object) =>
      Promise.resolve({
        ...(rooms.find((candidate) => candidate.id === roomId) ?? room(roomId, 0)),
        ...changes,
        version: 2,
      }),
    ),
    deleteRoom: vi.fn(() => Promise.resolve()),
  };
  const deleteJob = vi.fn(() => Promise.resolve());
  const service = createRoomService({
    store,
    jobs: { listJobs: () => Promise.resolve(jobs), deleteJob },
    households: { getHousehold: () => Promise.resolve(household) },
    now: () => '2026-11-23T11:30:00.000Z',
    newId: () => `id-${String((next += 1))}`,
  });
  return { service, added, store, deleteJob };
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
    expect(store.updateRoom).toHaveBeenCalledWith(
      'home-1',
      'room-a',
      { name: 'Box room', version: 1 },
      [],
    );
    expect(store.deleteRoom).toHaveBeenCalledWith('home-1', 'room-a');
  });
});

describe('room appliances', () => {
  it("lists a room with the appliances its jobs need, as setup's rooms save none", async () => {
    const { service } = serviceWith([KITCHEN], FLAT, [job('job-oven', 'kitchen.oven')]);
    const [kitchen] = await service.listRooms('home-1');
    expect(kitchen?.appliances).toEqual(['oven']);
  });

  it("adds a ticked appliance's jobs in the same write as the room, from today", async () => {
    const { service, store, deleteJob } = serviceWith([KITCHEN], FLAT, [
      job('job-oven', 'kitchen.oven'),
    ]);
    const saved = await service.updateRoom('home-1', 'room-kitchen', {
      appliances: ['oven', 'kettle'],
      version: 1,
    });
    expect(saved.appliances).toEqual(['oven', 'kettle']);
    const [, , changes, jobsToAdd] = vi.mocked(store.updateRoom).mock.calls[0] ?? [];
    expect(changes).toEqual({ appliances: ['oven', 'kettle'], version: 1 });
    expect(jobsToAdd?.map((added) => added.libraryId)).toEqual(['kitchen.descale-kettle']);
    expect(jobsToAdd?.every((added) => added.startDate >= '2026-11-24')).toBe(true);
    expect(deleteJob).not.toHaveBeenCalled();
  });

  it("removes an unticked appliance's jobs after the room is saved", async () => {
    const { service, store, deleteJob } = serviceWith([KITCHEN], FLAT, [
      job('job-oven', 'kitchen.oven'),
      job('job-bins', null),
    ]);
    const saved = await service.updateRoom('home-1', 'room-kitchen', {
      appliances: [],
      version: 1,
    });
    expect(saved.appliances).toEqual([]);
    expect(store.updateRoom).toHaveBeenCalledWith(
      'home-1',
      'room-kitchen',
      { appliances: [], version: 1 },
      [],
    );
    expect(deleteJob).toHaveBeenCalledExactlyOnceWith('home-1', 'job-oven');
  });

  it("doesn't touch jobs when the save fails, for example a stale version", async () => {
    const { service, store, deleteJob } = serviceWith([KITCHEN], FLAT, [
      job('job-oven', 'kitchen.oven'),
    ]);
    vi.mocked(store.updateRoom).mockRejectedValue(new Error('Someone else changed this room'));
    await expect(
      service.updateRoom('home-1', 'room-kitchen', { appliances: [], version: 1 }),
    ).rejects.toThrow('Someone else changed this room');
    expect(deleteJob).not.toHaveBeenCalled();
  });

  it('says so when the room has gone', async () => {
    const { service } = serviceWith([]);
    await expect(
      service.updateRoom('home-1', 'room-kitchen', { appliances: ['oven'], version: 1 }),
    ).rejects.toThrow('No such room');
  });

  it('says so when the home has gone', async () => {
    const { service } = serviceWith([KITCHEN], null);
    await expect(
      service.updateRoom('home-1', 'room-kitchen', { appliances: ['oven'], version: 1 }),
    ).rejects.toThrow('No such home');
  });
});
