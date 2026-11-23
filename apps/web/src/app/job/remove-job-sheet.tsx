'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import type { JobDetails } from '@/lib/home/job-details';
import { useRemoveJob } from './use-job-actions';
import type { JobAddress } from './use-job-actions';

interface RemoveJobSheetProps {
  details: JobDetails;
  address: JobAddress;
}

interface RemoveChoicesProps {
  remove: ReturnType<typeof useRemoveJob>;
  onRemove: () => void;
  onKeep: () => void;
}

function RemoveChoices({ remove, onRemove, onKeep }: RemoveChoicesProps): ReactNode {
  return (
    <div className="flex flex-col gap-3">
      {remove.error === null ? null : <FormAlert>{remove.error.message}</FormAlert>}
      <Button variant="danger" disabled={remove.isPending} onClick={onRemove}>
        {remove.isPending ? 'Removing…' : 'Remove'}
      </Button>
      <Button variant="secondary" onClick={onKeep}>
        Keep it
      </Button>
    </div>
  );
}

export function RemoveJobSheet({ details, address }: RemoveJobSheetProps): ReactNode {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const remove = useRemoveJob(address);
  return (
    <BottomSheet
      title="Remove this job?"
      description={`“${details.name}” will stop showing for everyone in this home. This can’t be undone.`}
      open={isOpen}
      onOpenChange={(isOpening) => {
        setIsOpen(isOpening);
        if (isOpening) remove.reset();
      }}
      trigger={<Button variant="danger">Remove job</Button>}
    >
      <RemoveChoices
        remove={remove}
        onRemove={() => {
          remove.mutate(undefined, {
            onSuccess: () => {
              router.replace(details.roomHref);
            },
          });
        }}
        onKeep={() => {
          setIsOpen(false);
        }}
      />
    </BottomSheet>
  );
}
