'use client';

import { displayNameSchema } from '@cleaning-planner/contracts/primitives';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { AccountForm, FormAlert } from '@/components/account/account-screen';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { roomsError } from '@/lib/setup/home-setup';
import { useHomeSetup } from '@/lib/setup/home-setup-draft';
import { RoomChoices } from './room-choices';

interface RoomsErrors {
  homeName?: string | undefined;
  rooms?: string | undefined;
}

export function RoomsForm(): ReactNode {
  const router = useRouter();
  const { setup, change } = useHomeSetup();
  const [errors, setErrors] = useState<RoomsErrors>({});
  const submit = (): boolean => {
    const homeName = displayNameSchema.safeParse(setup.homeName);
    const nextErrors = {
      homeName: homeName.success ? undefined : homeName.error.issues[0]?.message,
      rooms: roomsError(setup.roomCounts),
    };
    setErrors(nextErrors);
    if (nextErrors.homeName !== undefined || nextErrors.rooms !== undefined) return false;
    router.push('/setup/appliances');
    return true;
  };
  return (
    <AccountForm onSubmit={submit} actions={<Button type="submit">Continue</Button>}>
      <TextField
        label="Home name"
        hint="What everyone calls it, like “Our flat”."
        autoComplete="off"
        value={setup.homeName}
        error={errors.homeName}
        onChange={(event) => {
          change({ homeName: event.target.value });
        }}
      />
      <RoomChoices
        roomCounts={setup.roomCounts}
        onChange={(roomCounts) => {
          change({ roomCounts });
        }}
      />
      {errors.rooms !== undefined && <FormAlert>{errors.rooms}</FormAlert>}
    </AccountForm>
  );
}
