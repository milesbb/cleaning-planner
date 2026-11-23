'use client';

import type { Member } from '@cleaning-planner/contracts/household';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert, TEXT_ACTION_CLASSES } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { useMakeOwner, useRemoveMember } from './use-home-settings-actions';

interface ManageMemberSheetProps {
  householdId: string;
  member: Member;
}

interface MemberChoicesProps {
  member: Member;
  isBusy: boolean;
  onMakeOwner: () => void;
  onRemove: () => void;
}

function MemberChoices({ member, isBusy, onMakeOwner, onRemove }: MemberChoicesProps): ReactNode {
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  if (isConfirmingRemoval) {
    return (
      <>
        <p>
          {member.name} will stop seeing this home. Their own jobs go to anyone. They’ll need a new
          invite to come back.
        </p>
        <Button variant="danger" disabled={isBusy} onClick={onRemove}>
          Yes, remove {member.name}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setIsConfirmingRemoval(false);
          }}
        >
          Keep {member.name}
        </Button>
      </>
    );
  }
  return (
    <>
      <Button variant="secondary" disabled={isBusy} onClick={onMakeOwner}>
        Make {member.name} the owner
      </Button>
      <Button
        variant="danger"
        onClick={() => {
          setIsConfirmingRemoval(true);
        }}
      >
        Remove {member.name}
      </Button>
    </>
  );
}

export function ManageMemberSheet({ householdId, member }: ManageMemberSheetProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const makeOwner = useMakeOwner(householdId);
  const remove = useRemoveMember(householdId);
  const close = (): void => {
    setIsOpen(false);
  };
  const failure = makeOwner.error ?? remove.error;
  return (
    <BottomSheet
      title={member.name}
      description="The owner can change the home’s details, and who lives there."
      open={isOpen}
      onOpenChange={(isOpening) => {
        setIsOpen(isOpening);
        makeOwner.reset();
        remove.reset();
      }}
      trigger={
        <button type="button" aria-label={`Manage ${member.name}`} className={TEXT_ACTION_CLASSES}>
          Manage
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        {failure === null ? null : <FormAlert>{failure.message}</FormAlert>}
        <MemberChoices
          member={member}
          isBusy={makeOwner.isPending || remove.isPending}
          onMakeOwner={() => {
            makeOwner.mutate(member.userId, { onSuccess: close });
          }}
          onRemove={() => {
            remove.mutate(member.userId, { onSuccess: close });
          }}
        />
      </div>
    </BottomSheet>
  );
}
