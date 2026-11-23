'use client';

import { jobNameSchema } from '@cleaning-planner/contracts/job';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import type { SheetOpening } from '@/lib/lazy-sheet';
import type { JobDetails } from '@/lib/home/job-details';
import { useUpdateJob } from './use-job-actions';
import type { JobAddress } from './use-job-actions';

interface RenameJobSheetProps extends SheetOpening {
  details: JobDetails;
  address: JobAddress;
}

interface RenameForm {
  name: string;
  nameError: string | undefined;
  rename: ReturnType<typeof useUpdateJob>;
  setName: (name: string) => void;
  save: () => void;
}

function useRenameForm({ details, address, onOpenChange }: RenameJobSheetProps): RenameForm {
  const [name, setName] = useState(details.name);
  const [nameError, setNameError] = useState<string | undefined>();
  const rename = useUpdateJob(address);
  return {
    name,
    nameError,
    rename,
    setName,
    save: (): void => {
      const parsed = jobNameSchema.safeParse(name);
      setNameError(parsed.success ? undefined : parsed.error.issues[0]?.message);
      if (!parsed.success) return;
      const close = (): void => {
        onOpenChange(false);
      };
      rename.mutate({ name: parsed.data, version: details.version }, { onSuccess: close });
    },
  };
}

// Loaded on first use (`LazySheet`), and fresh each time it opens.
export function RenameJobSheet(props: RenameJobSheetProps): ReactNode {
  const form = useRenameForm(props);
  return (
    <BottomSheet
      title="Rename job"
      open={props.open}
      onOpenChange={props.onOpenChange}
      returnFocusTo={props.returnFocusTo}
    >
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          form.save();
        }}
      >
        <TextField
          label="Name"
          autoComplete="off"
          value={form.name}
          error={form.nameError}
          onChange={(event) => {
            form.setName(event.target.value);
          }}
        />
        {form.rename.error === null ? null : <FormAlert>{form.rename.error.message}</FormAlert>}
        <Button type="submit" disabled={form.rename.isPending}>
          {form.rename.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </BottomSheet>
  );
}
