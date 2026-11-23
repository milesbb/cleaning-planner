'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { useLeaveHome } from './use-home-settings-actions';

interface LeaveHomeSheetProps {
  householdId: string;
  homeName: string;
}

export function LeaveHomeSheet({ householdId, homeName }: LeaveHomeSheetProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const leave = useLeaveHome(householdId);
  return (
    <BottomSheet
      title={`Leave ${homeName}?`}
      description="Its jobs stay with everyone else. You’ll need a new invite to come back."
      open={isOpen}
      onOpenChange={(isOpening) => {
        setIsOpen(isOpening);
        if (isOpening) leave.reset();
      }}
      trigger={<Button variant="danger">Leave this home</Button>}
    >
      <div className="flex flex-col gap-3">
        {leave.error === null ? null : <FormAlert>{leave.error.message}</FormAlert>}
        <Button
          variant="danger"
          disabled={leave.isPending}
          onClick={() => {
            leave.mutate();
          }}
        >
          {leave.isPending ? 'Leaving…' : 'Leave'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setIsOpen(false);
          }}
        >
          Stay
        </Button>
      </div>
    </BottomSheet>
  );
}
