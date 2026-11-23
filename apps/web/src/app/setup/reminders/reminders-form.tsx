'use client';

import type { Weekday } from '@cleaning-planner/schedule/types';
import type { ReactNode } from 'react';
import { AccountForm, FormAlert } from '@/components/account/account-screen';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { ReminderTime } from '@/lib/setup/home-setup';
import { useHomeSetup } from '@/lib/setup/home-setup-draft';
import { useCreateHome } from './use-create-home';

const REMINDER_TIMES = [
  { value: 'morning', label: 'Morning, 8am', isRecommended: true },
  { value: 'evening', label: 'Evening, 6pm' },
  { value: 'none', label: 'No reminders' },
] as const satisfies readonly { value: ReminderTime; label: string; isRecommended?: boolean }[];

const WEEK_STARTS = [
  { value: 'monday', label: 'Monday' },
  { value: 'sunday', label: 'Sunday' },
] as const satisfies readonly { value: Weekday; label: string }[];

export function RemindersForm(): ReactNode {
  const { setup, change } = useHomeSetup();
  const createHome = useCreateHome(setup);
  const isCreating = createHome.isPending || createHome.isSuccess;
  return (
    <AccountForm
      onSubmit={() => {
        if (!isCreating) createHome.mutate();
        return true;
      }}
      actions={
        <Button type="submit" disabled={isCreating}>
          {isCreating ? 'Setting up your home…' : 'Create home'}
        </Button>
      }
    >
      <SegmentedControl<ReminderTime>
        label="Daily reminder"
        options={REMINDER_TIMES}
        value={setup.reminderTime}
        onValueChange={(reminderTime) => {
          change({ reminderTime });
        }}
      />
      <p className="-mt-2 text-[0.9375rem]">
        We’ll ask before sending any notifications. You can change this in Settings.
      </p>
      <SegmentedControl<Weekday>
        label="Your week starts on"
        options={WEEK_STARTS}
        value={setup.weekStartsOn}
        onValueChange={(weekStartsOn) => {
          change({ weekStartsOn });
        }}
      />
      {createHome.error !== null && <FormAlert>{createHome.error.message}</FormAlert>}
    </AccountForm>
  );
}
