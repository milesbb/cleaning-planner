export type MoveDirection = 'up' | 'down';

export interface RoomPlace {
  id: string;
  order: number;
  version: number;
}

export interface RoomPosition {
  roomId: string;
  order: number;
  version: number;
}

export function movedRoomIds(
  roomIds: readonly string[],
  roomId: string,
  direction: MoveDirection,
): string[] {
  const from = roomIds.indexOf(roomId);
  const to = direction === 'up' ? from - 1 : from + 1;
  const reordered = [...roomIds];
  const neighbour = reordered[to];
  if (from < 0 || neighbour === undefined) return reordered;
  reordered[to] = roomId;
  reordered[from] = neighbour;
  return reordered;
}

// Each room's order becomes its place in the list, so only rooms whose place
// changed need saving.
export function positionsToSave(
  rooms: readonly RoomPlace[],
  orderedIds: readonly string[],
): RoomPosition[] {
  return orderedIds.flatMap((roomId, order) => {
    const room = rooms.find((candidate) => candidate.id === roomId);
    if (room === undefined || room.order === order) return [];
    return [{ roomId, order, version: room.version }];
  });
}
