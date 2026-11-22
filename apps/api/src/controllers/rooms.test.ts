import type { Room } from '@cleaning-planner/contracts/room';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Membership, MembershipReader } from '../middlewares/membership';
import type { RoomService } from '../services/room-service';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';
import { Errors } from '../utils/errors';

const ALEX_IN_HOME: Membership = { householdId: 'home-1', userId: 'user-alex', role: 'member' };
const KITCHEN: Room = {
  id: 'room-kitchen',
  type: 'kitchen',
  name: 'Kitchen',
  order: 0,
  appliances: ['dishwasher'],
  version: 1,
};

const memberships: MembershipReader = {
  findMembership: (householdId, userId) =>
    Promise.resolve(householdId === 'home-1' && userId === 'user-alex' ? ALEX_IN_HOME : null),
};

function roomService(): RoomService {
  return {
    listRooms: vi.fn(() => Promise.resolve([KITCHEN])),
    addRoom: vi.fn(() => Promise.resolve(KITCHEN)),
    updateRoom: vi.fn(() => Promise.resolve({ ...KITCHEN, name: 'Galley', version: 2 })),
    deleteRoom: vi.fn(() => Promise.resolve()),
  };
}

type Method = 'get' | 'post' | 'patch' | 'delete';

function callAs(rooms: RoomService, method: Method, path: string, userId: string): request.Test {
  const agent = request(testApp({ rooms, memberships }));
  return agent[method](path).set(CLAIMS_HEADER, signedInAs(userId));
}

const ROOM_ROUTES = [
  ['get', '/v1/households/home-1/rooms'],
  ['post', '/v1/households/home-1/rooms'],
  ['patch', '/v1/households/home-1/rooms/room-kitchen'],
  ['delete', '/v1/households/home-1/rooms/room-kitchen'],
] as const;

describe('/v1/households/:householdId/rooms', () => {
  it.each(ROOM_ROUTES)(
    'gives someone outside the home a 403 for %s %s and touches nothing',
    async (method, path) => {
      const rooms = roomService();
      const response = await callAs(rooms, method, path, 'user-stranger').send({
        type: 'office',
        name: 'Study',
      });
      expect(response.status).toBe(403);
      for (const operation of Object.values(rooms)) expect(operation).not.toHaveBeenCalled();
    },
  );

  it('lists the home’s rooms', async () => {
    const response = await callAs(roomService(), 'get', '/v1/households/home-1/rooms', 'user-alex');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([KITCHEN]);
  });

  it('adds a room and answers 201', async () => {
    const rooms = roomService();
    const response = await callAs(rooms, 'post', '/v1/households/home-1/rooms', 'user-alex').send({
      type: 'kitchen',
      name: 'Kitchen',
      appliances: ['dishwasher'],
    });
    expect(response.status).toBe(201);
    expect(response.body).toEqual(KITCHEN);
    expect(rooms.addRoom).toHaveBeenCalledWith('home-1', {
      type: 'kitchen',
      name: 'Kitchen',
      appliances: ['dishwasher'],
    });
  });

  it('turns away a room with unknown fields before adding it', async () => {
    const rooms = roomService();
    const response = await callAs(rooms, 'post', '/v1/households/home-1/rooms', 'user-alex').send({
      type: 'kitchen',
      name: 'Kitchen',
      order: 7,
    });
    expect(response.status).toBe(400);
    expect(rooms.addRoom).not.toHaveBeenCalled();
  });

  it('renames a room', async () => {
    const rooms = roomService();
    const response = await callAs(
      rooms,
      'patch',
      '/v1/households/home-1/rooms/room-kitchen',
      'user-alex',
    ).send({ name: 'Galley', version: 1 });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'Galley', version: 2 });
    expect(rooms.updateRoom).toHaveBeenCalledWith('home-1', 'room-kitchen', {
      name: 'Galley',
      version: 1,
    });
  });

  it('needs something to change', async () => {
    const rooms = roomService();
    const response = await callAs(
      rooms,
      'patch',
      '/v1/households/home-1/rooms/room-kitchen',
      'user-alex',
    ).send({ version: 1 });
    expect(response.status).toBe(400);
    expect(rooms.updateRoom).not.toHaveBeenCalled();
  });

  it('answers 409 when someone else changed the room first', async () => {
    const rooms = roomService();
    vi.mocked(rooms.updateRoom).mockRejectedValue(
      Errors.conflict('Someone else changed this room. Reload and try again.'),
    );
    const response = await callAs(
      rooms,
      'patch',
      '/v1/households/home-1/rooms/room-kitchen',
      'user-alex',
    ).send({ name: 'Galley', version: 1 });
    expect(response.status).toBe(409);
  });

  it('deletes a room and answers 204', async () => {
    const rooms = roomService();
    const response = await callAs(
      rooms,
      'delete',
      '/v1/households/home-1/rooms/room-kitchen',
      'user-alex',
    );
    expect(response.status).toBe(204);
    expect(rooms.deleteRoom).toHaveBeenCalledWith('home-1', 'room-kitchen');
  });

  it('turns away a room id that cannot exist', async () => {
    const rooms = roomService();
    const response = await callAs(
      rooms,
      'delete',
      `/v1/households/home-1/rooms/${'x'.repeat(200)}`,
      'user-alex',
    );
    expect(response.status).toBe(400);
    expect(rooms.deleteRoom).not.toHaveBeenCalled();
  });
});
