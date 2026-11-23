'use client';

import { householdSchema, memberSchema } from '@cleaning-planner/contracts/household';
import type {
  Household,
  Member,
  UpdateHouseholdRequest,
} from '@cleaning-planner/contracts/household';
import { createInviteResponseSchema } from '@cleaning-planner/contracts/invite';
import type { CreateInviteResponse } from '@cleaning-planner/contracts/invite';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { NO_CONTENT } from '@/lib/api/api-client';
import type { ApiRequest } from '@/lib/api/api-client';
import { useApiClient } from '@/lib/api/api-provider';
import { forgetCurrentHome } from '@/lib/home/current-home';
import { homePath } from '@/lib/home/home-queries';

// A new code replaces the home's previous one, so a retry is harmless.
export function useCreateInvite(
  householdId: string,
): UseMutationResult<CreateInviteResponse, Error, void> {
  const client = useApiClient();
  return useMutation({
    mutationFn: () =>
      client.request({
        method: 'POST',
        path: `${homePath(householdId)}/invites`,
        response: createInviteResponseSchema,
      }),
  });
}

// Changes to the home and its people never retry on their own (a retry after
// a lost answer could fail a version check or act twice), and refresh the
// home and the list of homes when they succeed.
function useHomeChange<Variables, Result>(
  householdId: string,
  requestFor: (variables: Variables) => ApiRequest<Result>,
): UseMutationResult<Result, Error, Variables> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: (variables: Variables) => client.request(requestFor(variables)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home', householdId] }),
        queryClient.invalidateQueries({ queryKey: ['homes'] }),
      ]);
    },
  });
}

export function useUpdateHome(
  householdId: string,
): UseMutationResult<Household, Error, UpdateHouseholdRequest> {
  return useHomeChange(householdId, (changes: UpdateHouseholdRequest) => ({
    method: 'PATCH',
    path: homePath(householdId),
    body: changes,
    response: householdSchema,
  }));
}

function memberPath(householdId: string, userId: string): string {
  return `${homePath(householdId)}/members/${encodeURIComponent(userId)}`;
}

export function useMakeOwner(householdId: string): UseMutationResult<Member, Error, string> {
  return useHomeChange(householdId, (userId: string) => ({
    method: 'PATCH',
    path: memberPath(householdId, userId),
    body: { role: 'owner' },
    response: memberSchema,
  }));
}

export function useRemoveMember(householdId: string): UseMutationResult<undefined, Error, string> {
  return useHomeChange(householdId, (userId: string) => ({
    method: 'DELETE',
    path: memberPath(householdId, userId),
    response: NO_CONTENT,
  }));
}

// Leaving or deleting a home: forget it on this device and let the start
// route decide where to go (another home, or starting or joining one).
function useGoneFromHome(
  householdId: string,
  request: ApiRequest<undefined>,
): UseMutationResult<undefined, Error, void> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    retry: false,
    mutationFn: () => client.request(request),
    onSuccess: () => {
      forgetCurrentHome();
      queryClient.removeQueries({ queryKey: ['home', householdId] });
      void queryClient.invalidateQueries({ queryKey: ['homes'] });
      router.replace('/');
    },
  });
}

export function useLeaveHome(householdId: string): UseMutationResult<undefined, Error, void> {
  return useGoneFromHome(householdId, {
    method: 'POST',
    path: `${homePath(householdId)}/leave`,
    response: NO_CONTENT,
  });
}

export function useDeleteHome(householdId: string): UseMutationResult<undefined, Error, void> {
  return useGoneFromHome(householdId, {
    method: 'DELETE',
    path: homePath(householdId),
    response: NO_CONTENT,
  });
}
