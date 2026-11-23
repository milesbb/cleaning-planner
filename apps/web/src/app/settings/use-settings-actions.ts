'use client';

import { profileSchema } from '@cleaning-planner/contracts/profile';
import type { Profile, UpdateProfileRequest } from '@cleaning-planner/contracts/profile';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useApiClient } from '@/lib/api/api-provider';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { forgetCurrentHome } from '@/lib/home/current-home';

const SIGN_OUT_FAILED = 'Couldn’t sign out. Try again.';

// A new name or colour also changes how you appear in every home's members.
export function useUpdateProfile(): UseMutationResult<Profile, Error, UpdateProfileRequest> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: UpdateProfileRequest) =>
      client.request({ method: 'PATCH', path: '/v1/me', body: changes, response: profileSchema }),
    onSuccess: async (profile) => {
      queryClient.setQueryData(['me'], profile);
      await queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

// Signing out clears everything this device kept about the account, so the
// next person to use it starts clean.
export function useSignOut(): UseMutationResult<void, Error, void> {
  const auth = useAccountAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    retry: false,
    mutationFn: async () => {
      try {
        await auth.signOut();
      } catch {
        throw new Error(SIGN_OUT_FAILED);
      }
    },
    onSuccess: () => {
      forgetCurrentHome();
      queryClient.clear();
      router.replace('/welcome');
    },
  });
}
