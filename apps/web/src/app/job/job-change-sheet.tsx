'use client';

import type { UpdateJobRequest } from '@cleaning-planner/contracts/job';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert, TEXT_ACTION_CLASSES } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { useUpdateJob } from './use-job-actions';
import type { JobAddress } from './use-job-actions';

type JobChangeRequest = Omit<UpdateJobRequest, 'version'>;

export interface JobChangeSheetProps<Value> {
  address: JobAddress;
  version: number;
  title: string;
  trigger: string;
  current: Value;
  changeFor: (value: Value) => JobChangeRequest;
  renderField: (value: Value, setValue: (value: Value) => void) => ReactNode;
}

interface JobChange<Value> {
  isOpen: boolean;
  value: Value;
  setValue: (value: Value) => void;
  update: ReturnType<typeof useUpdateJob>;
  openOrClose: (isOpening: boolean) => void;
  save: () => void;
}

function useJobChange<Value>({
  address,
  version,
  current,
  changeFor,
}: Pick<
  JobChangeSheetProps<Value>,
  'address' | 'version' | 'current' | 'changeFor'
>): JobChange<Value> {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(current);
  const update = useUpdateJob(address);
  const close = (): void => {
    setIsOpen(false);
  };
  return {
    ...{ isOpen, value, setValue, update },
    openOrClose: (isOpening): void => {
      setIsOpen(isOpening);
      if (!isOpening) return;
      setValue(current);
      update.reset();
    },
    save: (): void => {
      if (value === current) close();
      else update.mutate({ ...changeFor(value), version }, { onSuccess: close });
    },
  };
}

// A sheet that changes one thing about a job: nothing is sent when it's
// unchanged, and a failure keeps the sheet open with the API's message.
export function JobChangeSheet<Value>(props: JobChangeSheetProps<Value>): ReactNode {
  const change = useJobChange(props);
  const { update } = change;
  return (
    <BottomSheet
      title={props.title}
      open={change.isOpen}
      onOpenChange={change.openOrClose}
      trigger={
        <button type="button" className={`${TEXT_ACTION_CLASSES} self-start`}>
          {props.trigger}
        </button>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          change.save();
        }}
      >
        {props.renderField(change.value, change.setValue)}
        {update.error === null ? null : <FormAlert>{update.error.message}</FormAlert>}
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </BottomSheet>
  );
}
