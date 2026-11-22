import { recordIdSchema } from '@cleaning-planner/contracts/primitives';
import { newRoomSchema, updateRoomRequestSchema } from '@cleaning-planner/contracts/room';
import { Router } from 'express';
import type { Request } from 'express';
import { membershipOf, requireMember } from '../middlewares/membership';
import type { MembershipReader } from '../middlewares/membership';
import type { RoomService } from '../services/room-service';
import { HttpStatus } from '../utils/http-status';
import { parseOrThrow } from '../utils/validation';

function roomIdOf(request: Request): string {
  return parseOrThrow(recordIdSchema, request.params.roomId);
}

export function roomsRouter(rooms: RoomService, memberships: MembershipReader): Router {
  const router = Router({ mergeParams: true });
  router.use(requireMember(memberships));
  router.get('/', async (_request, response) => {
    response.json(await rooms.listRooms(membershipOf(response).householdId));
  });
  router.post('/', async (request, response) => {
    const newRoom = parseOrThrow(newRoomSchema, request.body);
    const room = await rooms.addRoom(membershipOf(response).householdId, newRoom);
    response.status(HttpStatus.created).json(room);
  });
  router.patch('/:roomId', async (request, response) => {
    const changes = parseOrThrow(updateRoomRequestSchema, request.body);
    const { householdId } = membershipOf(response);
    response.json(await rooms.updateRoom(householdId, roomIdOf(request), changes));
  });
  router.delete('/:roomId', async (request, response) => {
    await rooms.deleteRoom(membershipOf(response).householdId, roomIdOf(request));
    response.status(HttpStatus.noContent).end();
  });
  return router;
}
