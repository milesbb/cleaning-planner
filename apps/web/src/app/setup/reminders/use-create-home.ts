'use client';

import { householdSchema } from '@cleaning-planner/contracts/household';
import type { Household } from '@cleaning-planner/contracts/household';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useApiClient } from '@/lib/api/api-provider';
import { rememberCurrentHome } from '@/lib/home/current-home';
import { createHouseholdRequestFor, homeTimeZone } from '@/lib/setup/home-setup';
import type { HomeSetup } from '@/lib/setup/home-setup';
import { forgetHomeSetup } from '@/lib/setup/home-setup-draft';
import { rememberJustCreatedHome } from '@/lib/setup/just-created-home';
import { rememberReminderTime } from '@/lib/setup/reminder-preference';

// Creates the home with its rooms and ready-made jobs, then explains how the app works.
export function useCreateHome(setup: HomeSetup): UseMutationResult<Household, Error, void> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    // Creating a home has no idempotency key, so a retry after a lost answer
    // could create a second home. The person retries by pressing the button.
    retry: false,
    mutationFn: () =>
      client.request({
        method: 'POST',
        path: '/v1/households',
        body: createHouseholdRequestFor(setup, homeTimeZone()),
        response: householdSchema,
      }),
    onSuccess: async (household) => {
      rememberCurrentHome(household.id);
      // 'all': the list Start or join saved isn't on screen now, and Today
      // would otherwise open with it.
      await queryClient.invalidateQueries({ queryKey: ['homes'], refetchType: 'all' });
      rememberReminderTime(setup.reminderTime);
      forgetHomeSetup();
      rememberJustCreatedHome();
      router.replace('/setup/done');
    },
  });
}
