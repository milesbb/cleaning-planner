'use client';

import { householdSchema } from '@cleaning-planner/contracts/household';
import type { Household } from '@cleaning-planner/contracts/household';
import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useApiClient } from '@/lib/api/api-provider';
import { createHouseholdRequestFor, homeTimeZone } from '@/lib/setup/home-setup';
import type { HomeSetup } from '@/lib/setup/home-setup';
import { forgetHomeSetup } from '@/lib/setup/home-setup-draft';
import { rememberReminderTime } from '@/lib/setup/reminder-preference';

// Creates the home with its rooms and ready-made jobs, then opens Today.
export function useCreateHome(setup: HomeSetup): UseMutationResult<Household, Error, void> {
  const client = useApiClient();
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
    onSuccess: () => {
      rememberReminderTime(setup.reminderTime);
      forgetHomeSetup();
      router.replace('/today');
    },
  });
}
