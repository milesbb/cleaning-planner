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

// The kitchen and living room; a room can be added.
export async function fakeRooms(page: Page): Promise<void> {
  const rooms: object[] = [...ROOMS];
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
