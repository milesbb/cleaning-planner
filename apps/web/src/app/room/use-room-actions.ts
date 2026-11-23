'use client';

import { roomSchema } from '@cleaning-planner/contracts/room';
import type { Room, UpdateRoomRequest } from '@cleaning-planner/contracts/room';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { ApiRequestError, NO_CONTENT } from '@/lib/api/api-client';
import { useApiClient } from '@/lib/api/api-provider';
import { homePath } from '@/lib/home/home-queries';

export interface RoomAddress {
  householdId: string;
  roomId: string;
}

function roomPath({ householdId, roomId }: RoomAddress): string {
  return `${homePath(householdId)}/rooms/${encodeURIComponent(roomId)}`;
}

export function useRefreshHome(householdId: string): () => Promise<void> {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['home', householdId] });
}

// The API refuses a change made from an old version of the room.
export function isStaleRoom(error: Error | null): boolean {
  return error instanceof ApiRequestError && error.code === 'conflict';
}

export function useUpdateRoom(
  address: RoomAddress,
): UseMutationResult<Room, Error, UpdateRoomRequest> {
  const client = useApiClient();
  const refreshHome = useRefreshHome(address.householdId);
  return useMutation({
    // A retry after a lost answer would fail the version check, so don't.
    retry: false,
    mutationFn: (changes: UpdateRoomRequest) =>
      client.request({
        method: 'PATCH',
        path: roomPath(address),
        body: changes,
        response: roomSchema,
      }),
    onSuccess: refreshHome,
  });
}

export function useRemoveRoom(address: RoomAddress): UseMutationResult<undefined, Error, void> {
  const client = useApiClient();
  const refreshHome = useRefreshHome(address.householdId);
  return useMutation({
    retry: false,
    mutationFn: () =>
      client.request({ method: 'DELETE', path: roomPath(address), response: NO_CONTENT }),
    // Not waited for, so the screen leaves before the refreshed home no longer has the room.
    onSuccess: (): void => {
      void refreshHome();
    },
  });
}
