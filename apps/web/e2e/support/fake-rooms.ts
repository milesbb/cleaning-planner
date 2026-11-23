import type { Page } from '@playwright/test';
import { asObject, fakeApi } from './fake-backend';
import { JOB_LIBRARY } from '@cleaning-planner/schedule/library/job-library';
import { calendarDay, HOME_PATH } from './fake-home-state';
import type { SavedJob } from './fake-jobs';

const ROOMS = [
  { id: 'room-kitchen', type: 'kitchen', name: 'Kitchen', order: 0, appliances: [], version: 1 },
  {
    id: 'room-living',
    type: 'livingRoom',
    name: 'Living room',
    order: 1,
    appliances: [],
    version: 1,
  },
];

type SavedRoom = Record<string, unknown>;

const ROOM_CHANGED = {
  status: 409,
  body: {
    error: {
      code: 'conflict',
      message: 'Someone else changed this room. Reload and try again.',
    },
  },
};

function roomIdIn(url: string): string {
  return /rooms\/([^/?]+)/.exec(url)?.[1] ?? '';
}

function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// As the API does: a ticked appliance adds its library jobs to the room, and
// an unticked one removes the jobs that need it.
function applyApplianceChange(room: SavedRoom, appliances: unknown[], jobs: SavedJob[]): void {
  const before = listOf(room.appliances);
  const ticked = appliances.filter((appliance) => !before.includes(appliance));
  const unticked = before.filter((appliance) => !appliances.includes(appliance));
  const inRoom = JOB_LIBRARY.filter((libraryJob) => libraryJob.room === room.type);
  for (const libraryJob of inRoom.filter((candidate) => ticked.includes(candidate.needs))) {
    jobs.push({
      id: `job-${libraryJob.id.replaceAll('.', '-')}`,
      roomId: room.id,
      libraryId: libraryJob.id,
      name: libraryJob.name,
      icon: libraryJob.icon,
      schedule: libraryJob.defaultSchedule,
      startDate: calendarDay(0),
      assignment: { kind: 'anyone' },
      snooze: null,
      effortMinutes: libraryJob.effortMinutes,
      version: 1,
    });
  }
  const removedLibraryIds = inRoom
    .filter((candidate) => unticked.includes(candidate.needs))
    .map((candidate) => candidate.id);
  const kept = jobs.filter((job) => !removedLibraryIds.includes(String(job.libraryId)));
  jobs.splice(0, jobs.length, ...kept);
}

// A change is refused when it was made from an old version, as the API does.
async function fakeRoomChanges(page: Page, rooms: SavedRoom[], jobs: SavedJob[]): Promise<void> {
  await fakeApi(
    page,
    `${HOME_PATH}/rooms/*`,
    (request) => {
      const saved = rooms.find((room) => room.id === roomIdIn(request.url()));
      if (saved === undefined) return { status: 404, body: { error: { code: 'notFound' } } };
      const { version, ...changes } = { version: undefined, ...asObject(request.postDataJSON()) };
      if (version !== saved.version) return ROOM_CHANGED;
      if ('appliances' in changes) applyApplianceChange(saved, listOf(changes.appliances), jobs);
      Object.assign(saved, changes, { version: Number(saved.version) + 1 });
      return { body: saved };
    },
    { method: 'PATCH' },
  );
  await fakeApi(
    page,
    `${HOME_PATH}/rooms/*`,
    (request) => {
      const index = rooms.findIndex((room) => room.id === roomIdIn(request.url()));
      if (index >= 0) rooms.splice(index, 1);
      return { status: 204, body: undefined };
    },
    { method: 'DELETE' },
  );
}

// The kitchen and living room; a room can be added, renamed and removed, and
// its appliances changed (adding or removing jobs in `jobs`).
export async function fakeRooms(page: Page, jobs: SavedJob[]): Promise<void> {
  const rooms: SavedRoom[] = ROOMS.map((room) => ({ ...room }));
  await fakeRoomChanges(page, rooms, jobs);
  await fakeApi(page, `${HOME_PATH}/rooms`, () => ({ body: rooms }), { method: 'GET' });
  await fakeApi(
    page,
    `${HOME_PATH}/rooms`,
    (request) => {
      const room = {
        id: `room-${String(rooms.length + 1)}`,
        order: rooms.length,
        appliances: [],
        version: 1,
        ...asObject(request.postDataJSON()),
      };
      rooms.push(room);
      return { status: 201, body: room };
    },
    { method: 'POST' },
  );
}
