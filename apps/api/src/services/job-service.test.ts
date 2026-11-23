import type { Household } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import type { CreateJobRequest } from '@cleaning-planner/contracts/job-request';
import type { Room } from '@cleaning-planner/contracts/room';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it, vi } from 'vitest';
import { createJobService } from './job-service';
import type { JobStore } from './job-service';

const FLAT: Household = {
  id: 'home-1',
  name: 'Our flat',
  timeZone: 'Pacific/Auckland',
  weekStartsOn: 'monday',
  ownerId: 'user-sam',
  version: 1,
};
const KITCHEN: Room = {
  id: 'room-kitchen',
  type: 'kitchen',
  name: 'Kitchen',
  order: 0,
  appliances: [],
  version: 1,
};
const WIPE_BENCHES: Job = {
  id: 'job-benches',
  roomId: 'room-kitchen',
  libraryId: null,
  name: 'Wipe benches',
  icon: 'dishwasher',
  schedule: { type: 'floating', every: { value: 1, unit: 'day' } },
  startDate: parseCalendarDate('2026-11-24'),
  assignment: { kind: 'anyone' },
  snooze: null,
  effortMinutes: 5,
  version: 1,
};
const CUSTOM_JOB: CreateJobRequest = {
  roomId: 'room-kitchen',
  name: 'Descale kettle',
  icon: 'dishwasher',
  schedule: { type: 'floating', every: { value: 1, unit: 'month' } },
  assignment: { kind: 'member', memberId: 'user-alex' },
  effortMinutes: 10,
};

interface Setup {
  jobs?: Job[];
  household?: Household | null;
}

function serviceWith({ jobs = [WIPE_BENCHES], household = FLAT }: Setup = {}): {
  service: ReturnType<typeof createJobService>;
  store: JobStore;
} {
  const store: JobStore = {
    listJobs: vi.fn(() => Promise.resolve(jobs)),
    findJob: vi.fn((_householdId: string, jobId: string) =>
      Promise.resolve(jobs.find((job) => job.id === jobId) ?? null),
    ),
    addJob: vi.fn(() => Promise.resolve()),
    updateJob: vi.fn(() => Promise.resolve({ ...WIPE_BENCHES, version: 2 })),
    deleteJob: vi.fn(() => Promise.resolve()),
  };
  const service = createJobService({
    store,
    rooms: { listRooms: () => Promise.resolve([KITCHEN]) },
    households: { getHousehold: () => Promise.resolve(household) },
    memberships: {
      findMembership: (householdId, userId) =>
        Promise.resolve(userId === 'user-alex' ? { householdId, userId, role: 'member' } : null),
    },
    now: () => '2026-11-23T11:30:00.000Z',
    newId: () => 'job-new',
  });
  return { service, store };
}

describe('job service', () => {
  it('lists the home’s jobs', async () => {
    const { service } = serviceWith();
    await expect(service.listJobs('home-1')).resolves.toEqual([WIPE_BENCHES]);
  });

  it('finds one job, or says it does not exist', async () => {
    const { service } = serviceWith();
    await expect(service.getJob('home-1', 'job-benches')).resolves.toEqual(WIPE_BENCHES);
    await expect(service.getJob('home-1', 'job-missing')).rejects.toThrow('No such job');
  });

  it('adds a custom job starting today in the home’s time zone', async () => {
    const { service, store } = serviceWith();
    const created = await service.addJob('home-1', CUSTOM_JOB);
    expect(created).toEqual({
      ...CUSTOM_JOB,
      id: 'job-new',
      libraryId: null,
      startDate: parseCalendarDate('2026-11-24'),
      snooze: null,
      version: 1,
    });
    expect(store.addJob).toHaveBeenCalledWith('home-1', created);
  });

  it('keeps a library job’s id and a chosen start date', async () => {
    const { service } = serviceWith();
    await expect(
      service.addJob('home-1', {
        ...CUSTOM_JOB,
        libraryId: 'kitchen.dishwasher-filter',
        startDate: parseCalendarDate('2026-12-01'),
      }),
    ).resolves.toMatchObject({ libraryId: 'kitchen.dishwasher-filter', startDate: '2026-12-01' });
  });

  it('refuses a room from somewhere else', async () => {
    const { service, store } = serviceWith();
    await expect(
      service.addJob('home-1', { ...CUSTOM_JOB, roomId: 'room-elsewhere' }),
    ).rejects.toMatchObject({ statusCode: 400, fields: { roomId: 'Pick a room in this home' } });
    expect(store.addJob).not.toHaveBeenCalled();
  });

  it('refuses to give a job to someone outside the home', async () => {
    const { service } = serviceWith();
    await expect(
      service.addJob('home-1', {
        ...CUSTOM_JOB,
        assignment: { kind: 'member', memberId: 'user-stranger' },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      fields: { assignment: 'Pick someone who lives here' },
    });
  });

  it('says so when the home has gone', async () => {
    const { service } = serviceWith({ household: null });
    await expect(service.addJob('home-1', CUSTOM_JOB)).rejects.toThrow('No such home');
  });

  it('checks a new room and person before changing a job', async () => {
    const { service, store } = serviceWith();
    await expect(
      service.updateJob('home-1', 'job-benches', { roomId: 'room-elsewhere', version: 1 }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      service.updateJob('home-1', 'job-benches', {
        assignment: { kind: 'member', memberId: 'user-stranger' },
        version: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(store.updateJob).not.toHaveBeenCalled();
  });

  it('passes a valid change and a delete to the store', async () => {
    const { service, store } = serviceWith();
    await expect(
      service.updateJob('home-1', 'job-benches', { name: 'Wipe tops', version: 1 }),
    ).resolves.toMatchObject({ version: 2 });
    await service.deleteJob('home-1', 'job-benches');
    expect(store.updateJob).toHaveBeenCalledWith('home-1', 'job-benches', {
      name: 'Wipe tops',
      version: 1,
    });
    expect(store.deleteJob).toHaveBeenCalledWith('home-1', 'job-benches');
  });
});
