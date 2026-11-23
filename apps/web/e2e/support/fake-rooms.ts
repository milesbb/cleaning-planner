import type { Page } from '@playwright/test';
import { asObject, fakeApi } from './fake-backend';
import { HOME_PATH } from './fake-home-state';

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

// A change is refused when it was made from an old version, as the API does.
async function fakeRoomChanges(page: Page, rooms: SavedRoom[]): Promise<void> {
  await fakeApi(
    page,
    `${HOME_PATH}/rooms/*`,
    (request) => {
      const saved = rooms.find((room) => room.id === roomIdIn(request.url()));
      if (saved === undefined) return { status: 404, body: { error: { code: 'notFound' } } };
      const { version, ...changes } = { version: undefined, ...asObject(request.postDataJSON()) };
      if (version !== saved.version) return ROOM_CHANGED;
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

// The kitchen and living room; a room can be added, renamed and removed.
export async function fakeRooms(page: Page): Promise<void> {
  const rooms: SavedRoom[] = ROOMS.map((room) => ({ ...room }));
  await fakeRoomChanges(page, rooms);
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
