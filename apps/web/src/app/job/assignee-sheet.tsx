'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert, TEXT_ACTION_CLASSES } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { assignmentFor, choiceFor } from '@/lib/home/assignee-choices';
import type { JobDetails } from '@/lib/home/job-details';
import { useUpdateJob } from './use-job-actions';
import type { JobAddress } from './use-job-actions';

interface AssigneeSheetProps {
  details: JobDetails;
  address: JobAddress;
}

interface AssigneeForm {
  isOpen: boolean;
  choice: string;
  update: ReturnType<typeof useUpdateJob>;
  setChoice: (choice: string) => void;
  openOrClose: (isOpening: boolean) => void;
  save: () => void;
}

function useAssigneeForm({ details, address }: AssigneeSheetProps): AssigneeForm {
  const [isOpen, setIsOpen] = useState(false);
  const [choice, setChoice] = useState(() => choiceFor(details.assignment));
  const update = useUpdateJob(address);
  return {
    isOpen,
    choice,
    update,
    setChoice,
    openOrClose: (isOpening): void => {
      setIsOpen(isOpening);
      if (!isOpening) return;
      setChoice(choiceFor(details.assignment));
      update.reset();
    },
    save: (): void => {
      const close = (): void => {
        setIsOpen(false);
      };
      const changes = { assignment: assignmentFor(choice), version: details.version };
      update.mutate(changes, { onSuccess: close });
    },
  };
}

export function AssigneeSheet(props: AssigneeSheetProps): ReactNode {
  const { details } = props;
  const { isOpen, choice, update, setChoice, openOrClose, save } = useAssigneeForm(props);
  return (
    <BottomSheet
      title="Who does it"
      description="Taking turns goes round everyone in the home, one time each."
      open={isOpen}
      onOpenChange={openOrClose}
      trigger={
        <button type="button" className={`${TEXT_ACTION_CLASSES} self-start`}>
          Change who does it
        </button>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <SegmentedControl
          label="Person"
          options={details.assigneeChoices}
          value={choice}
          onValueChange={setChoice}
        />
        {update.error === null ? null : <FormAlert>{update.error.message}</FormAlert>}
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </BottomSheet>
  );
}
