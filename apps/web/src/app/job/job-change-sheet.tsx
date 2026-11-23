'use client';

import type { UpdateJobRequest } from '@cleaning-planner/contracts/job';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import type { SheetOpening } from '@/lib/lazy-sheet';
import { useUpdateJob } from './use-job-actions';
import type { JobAddress } from './use-job-actions';

type JobChangeRequest = Omit<UpdateJobRequest, 'version'>;

export interface JobChangeSheetProps<Value> extends SheetOpening {
  address: JobAddress;
  version: number;
  title: string;
  current: Value;
  changeFor: (value: Value) => JobChangeRequest;
  renderField: (value: Value, setValue: (value: Value) => void) => ReactNode;
}

interface JobChange<Value> {
  value: Value;
  setValue: (value: Value) => void;
  update: ReturnType<typeof useUpdateJob>;
  save: () => void;
}

function useJobChange<Value>({
  address,
  version,
  current,
  changeFor,
  onOpenChange,
}: Pick<
  JobChangeSheetProps<Value>,
  'address' | 'version' | 'current' | 'changeFor' | 'onOpenChange'
>): JobChange<Value> {
  const [value, setValue] = useState(current);
  const update = useUpdateJob(address);
  const close = (): void => {
    onOpenChange(false);
  };
  return {
    ...{ value, setValue, update },
    save: (): void => {
      if (value === current) close();
      else update.mutate({ ...changeFor(value), version }, { onSuccess: close });
    },
  };
}

// A sheet that changes one thing about a job: nothing is sent when it's
// unchanged, and a failure keeps the sheet open with the API's message.
// Loaded on first use (`LazySheet`), and fresh each time it opens.
export function JobChangeSheet<Value>(props: JobChangeSheetProps<Value>): ReactNode {
  const change = useJobChange(props);
  const { update } = change;
  return (
    <BottomSheet
      title={props.title}
      open={props.open}
      onOpenChange={props.onOpenChange}
      returnFocusTo={props.returnFocusTo}
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
