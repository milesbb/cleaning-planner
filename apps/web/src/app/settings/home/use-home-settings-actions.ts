'use client';

import { createInviteResponseSchema } from '@cleaning-planner/contracts/invite';
import type { CreateInviteResponse } from '@cleaning-planner/contracts/invite';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { NO_CONTENT } from '@/lib/api/api-client';
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

// After leaving, the start route decides where to go: another home, or
// starting or joining one.
export function useLeaveHome(householdId: string): UseMutationResult<undefined, Error, void> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    retry: false,
    mutationFn: () =>
      client.request({
        method: 'POST',
        path: `${homePath(householdId)}/leave`,
        response: NO_CONTENT,
      }),
    onSuccess: () => {
      forgetCurrentHome();
      queryClient.removeQueries({ queryKey: ['home', householdId] });
      void queryClient.invalidateQueries({ queryKey: ['homes'] });
      router.replace('/');
    },
  });
}
