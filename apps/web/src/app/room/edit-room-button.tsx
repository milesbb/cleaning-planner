'use client';

import type { Room } from '@cleaning-planner/contracts/room';
import { lazy } from 'react';
import type { ReactNode } from 'react';
import { PencilIcon } from '@/components/icons/interface-icons';
import { IconButton } from '@/components/ui/icon-button';
import { LazySheet } from '@/lib/lazy-sheet';

const EditRoomSheet = lazy(async () => ({
  default: (await import('./edit-room-sheet')).EditRoomSheet,
}));

interface EditRoomButtonProps {
  householdId: string;
  room: Room;
  jobCount: number;
}

// The sheet loads the first time the button is used, keeping the dialog and
// its forms out of Room's first load.
export function EditRoomButton(props: EditRoomButtonProps): ReactNode {
  return (
    <LazySheet
      trigger={(triggerProps) => (
        <IconButton label="Edit room" icon={<PencilIcon />} {...triggerProps} />
      )}
      sheet={(opening) => <EditRoomSheet {...opening} {...props} />}
    />
  );
}
