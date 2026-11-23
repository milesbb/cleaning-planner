'use client';

import { roomSchema } from '@cleaning-planner/contracts/room';
import type { NewRoom, Room } from '@cleaning-planner/contracts/room';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api/api-provider';
import { homePath } from '@/lib/home/home-queries';

// Adds a room (with its library jobs, made by the API) and refreshes the home.
export function useAddRoom(householdId: string): UseMutationResult<Room, Error, NewRoom> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    // No idempotency key on adding a room: a retry after a lost answer could add it twice.
    retry: false,
    mutationFn: (room: NewRoom) =>
      client.request({
        method: 'POST',
        path: `${homePath(householdId)}/rooms`,
        body: room,
        response: roomSchema,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home', householdId] }),
  });
}
