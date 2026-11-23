'use client';

import { lazy } from 'react';
import type { ReactNode } from 'react';
import { PlusIcon } from '@/components/icons/interface-icons';
import { Button } from '@/components/ui/button';
import { LazySheet } from '@/lib/lazy-sheet';

const AddRoomSheet = lazy(async () => ({
  default: (await import('./add-room-sheet')).AddRoomSheet,
}));

interface AddRoomButtonProps {
  householdId: string;
  roomNames: readonly string[];
}

// The sheet loads the first time the button is used, keeping the dialog and
// the room choices out of Home's first load.
export function AddRoomButton({ householdId, roomNames }: AddRoomButtonProps): ReactNode {
  return (
    <LazySheet
      trigger={(triggerProps) => (
        <Button variant="dashed" {...triggerProps}>
          <PlusIcon />
          Add a room
        </Button>
      )}
      sheet={(opening) => (
        <AddRoomSheet {...opening} householdId={householdId} roomNames={roomNames} />
      )}
    />
  );
}
