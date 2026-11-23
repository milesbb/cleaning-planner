'use client';

import { roomSchema } from '@cleaning-planner/contracts/room';
import type { Room } from '@cleaning-planner/contracts/room';
import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api/api-provider';
import { roomPath, useRefreshHome } from '../room/use-room-actions';
import type { RoomPosition } from './room-order';

// Saves each moved room's place with the version it was read at. Whatever
// happens, the home is read again before the next move, so every move sends
// current versions and a failed save shows the order the server kept.
export function useReorderRooms(
  householdId: string,
): UseMutationResult<Room[], Error, RoomPosition[]> {
  const client = useApiClient();
  const refreshHome = useRefreshHome(householdId);
  return useMutation({
    retry: false,
    mutationFn: (positions: RoomPosition[]) =>
      Promise.all(
        positions.map(({ roomId, order, version }) =>
          client.request({
            method: 'PATCH',
            path: roomPath({ householdId, roomId }),
            body: { order, version },
            response: roomSchema,
          }),
        ),
      ),
    onSettled: refreshHome,
  });
}
