'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { useDeleteHome } from './use-home-settings-actions';

interface DeleteHomeSheetProps {
  householdId: string;
  homeName: string;
}

export function DeleteHomeSheet({ householdId, homeName }: DeleteHomeSheetProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const deleteHome = useDeleteHome(householdId);
  return (
    <BottomSheet
      title={`Delete ${homeName}?`}
      description="Its rooms, jobs and history go for everyone who lives there. This can’t be undone."
      open={isOpen}
      onOpenChange={(isOpening) => {
        setIsOpen(isOpening);
        if (isOpening) deleteHome.reset();
      }}
      trigger={<Button variant="danger">Delete this home</Button>}
    >
      <div className="flex flex-col gap-3">
        {deleteHome.error === null ? null : <FormAlert>{deleteHome.error.message}</FormAlert>}
        <Button
          variant="danger"
          disabled={deleteHome.isPending}
          onClick={() => {
            deleteHome.mutate();
          }}
        >
          {deleteHome.isPending ? 'Deleting…' : 'Delete home'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setIsOpen(false);
          }}
        >
          Keep it
        </Button>
      </div>
    </BottomSheet>
  );
}
