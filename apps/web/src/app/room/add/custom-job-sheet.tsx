'use client';

import { jobNameSchema } from '@cleaning-planner/contracts/job';
import type { CreateJobRequest } from '@cleaning-planner/contracts/job-request';
import { scheduleSchema } from '@cleaning-planner/contracts/schedule';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { AfterDoneFields } from '@/app/job/schedule-fields';
import { FormAlert } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import type { SheetOpening } from '@/lib/lazy-sheet';
import { TextField } from '@/components/ui/text-field';
import { jobHref } from '@/lib/home/job-href';
import { draftFrom, scheduleFrom } from '@/lib/home/schedule-draft';
import type { ScheduleDraft } from '@/lib/home/schedule-draft';
import { useAddJob } from './use-add-job';

const WEEKLY = draftFrom({ type: 'floating', every: { value: 1, unit: 'week' } });
const USUAL_EFFORT_MINUTES = 15;

interface CustomJobSheetProps extends SheetOpening {
  householdId: string;
  roomId: string;
}

interface CustomJobForm {
  name: string;
  nameError: string | undefined;
  draft: ScheduleDraft;
  addJob: ReturnType<typeof useAddJob>;
  setName: (name: string) => void;
  changeDraft: (changes: Partial<ScheduleDraft>) => void;
  save: () => void;
}

// Your own job starts simple (repeat after it's done, for anyone), then opens
// on Job detail to fine-tune.
function useCustomJobForm({ householdId, roomId }: CustomJobSheetProps): CustomJobForm {
  const router = useRouter();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [draft, setDraft] = useState(WEEKLY);
  const addJob = useAddJob(householdId);
  return {
    ...{ name, nameError, draft, addJob, setName },
    changeDraft: (changes): void => {
      setDraft((current) => ({ ...current, ...changes }));
    },
    save: (): void => {
      const parsed = jobNameSchema.safeParse(name);
      setNameError(parsed.success ? undefined : parsed.error.issues[0]?.message);
      if (!parsed.success) return;
      const job: CreateJobRequest = {
        roomId,
        name: parsed.data,
        icon: 'spray',
        schedule: scheduleSchema.parse(scheduleFrom(draft)),
        assignment: { kind: 'anyone' },
        effortMinutes: USUAL_EFFORT_MINUTES,
      };
      addJob.mutate(job, {
        onSuccess: (added) => {
          router.push(jobHref(added.id));
        },
      });
    },
  };
}

function CustomJobFields({ form }: { form: CustomJobForm }): ReactNode {
  return (
    <>
      <TextField
        label="Name"
        autoComplete="off"
        value={form.name}
        error={form.nameError}
        onChange={(event) => {
          form.setName(event.target.value);
        }}
      />
      <AfterDoneFields draft={form.draft} onChange={form.changeDraft} />
      {form.addJob.error === null ? null : <FormAlert>{form.addJob.error.message}</FormAlert>}
    </>
  );
}

// Loaded on first use (`LazySheet`), and fresh each time it opens.
export function CustomJobSheet(props: CustomJobSheetProps): ReactNode {
  const form = useCustomJobForm(props);
  return (
    <BottomSheet
      title="Make your own job"
      description="You can change how often and who does it once it’s added."
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
        <CustomJobFields form={form} />
        <Button type="submit" disabled={form.addJob.isPending}>
          {form.addJob.isPending ? 'Adding…' : 'Add job'}
        </Button>
      </form>
    </BottomSheet>
  );
}
