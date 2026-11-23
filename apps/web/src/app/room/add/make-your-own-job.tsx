'use client';

import { lazy } from 'react';
import type { ReactNode } from 'react';
import { PlusIcon } from '@/components/icons/interface-icons';
import { Button } from '@/components/ui/button';
import { LazySheet } from '@/lib/lazy-sheet';

const CustomJobSheet = lazy(async () => ({
  default: (await import('./custom-job-sheet')).CustomJobSheet,
}));

interface MakeYourOwnJobProps {
  householdId: string;
  roomId: string;
}

// The sheet loads the first time the button is used, keeping the dialog and
// its form out of Add a job's first load.
export function MakeYourOwnJob({ householdId, roomId }: MakeYourOwnJobProps): ReactNode {
  return (
    <LazySheet
      trigger={(triggerProps) => (
        <Button variant="dashed" {...triggerProps}>
          <PlusIcon />
          Make your own job
        </Button>
      )}
      sheet={(opening) => <CustomJobSheet {...opening} householdId={householdId} roomId={roomId} />}
    />
  );
}
