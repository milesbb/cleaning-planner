'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { assignmentFor, choiceFor } from '@/lib/home/assignee-choices';
import type { JobDetails } from '@/lib/home/job-details';
import type { SheetOpening } from '@/lib/lazy-sheet';
import { useUpdateJob } from './use-job-actions';
import type { JobAddress } from './use-job-actions';

interface AssigneeSheetProps extends SheetOpening {
  details: JobDetails;
  address: JobAddress;
}

interface AssigneeForm {
  choice: string;
  update: ReturnType<typeof useUpdateJob>;
  setChoice: (choice: string) => void;
  save: () => void;
}

function useAssigneeForm({ details, address, onOpenChange }: AssigneeSheetProps): AssigneeForm {
  const [choice, setChoice] = useState(() => choiceFor(details.assignment));
  const update = useUpdateJob(address);
  return {
    choice,
    update,
    setChoice,
    save: (): void => {
      const close = (): void => {
        onOpenChange(false);
      };
      const changes = { assignment: assignmentFor(choice), version: details.version };
      update.mutate(changes, { onSuccess: close });
    },
  };
}

// Loaded on first use (`LazySheet`), and fresh each time it opens.
export function AssigneeSheet(props: AssigneeSheetProps): ReactNode {
  const { details } = props;
  const { choice, update, setChoice, save } = useAssigneeForm(props);
  return (
    <BottomSheet
      title="Who does it"
      description="Taking turns goes round everyone in the home, one time each."
      open={props.open}
      onOpenChange={props.onOpenChange}
      returnFocusTo={props.returnFocusTo}
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
