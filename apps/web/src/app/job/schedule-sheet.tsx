'use client';

import { scheduleSchema } from '@cleaning-planner/contracts/schedule';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert, TEXT_ACTION_CLASSES } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { JobDetails } from '@/lib/home/job-details';
import { draftFrom, scheduleFrom } from '@/lib/home/schedule-draft';
import type { RepeatKind, ScheduleDraft } from '@/lib/home/schedule-draft';
import { AfterDoneFields, MonthDayFields, Recommendation, WeekdayFields } from './schedule-fields';
import { useUpdateJob } from './use-job-actions';
import type { JobAddress } from './use-job-actions';

const REPEAT_CHOICES = [
  { value: 'afterDone', label: 'After it’s done' },
  { value: 'weekdays', label: 'On set days' },
  { value: 'monthDay', label: 'Once a month' },
] as const satisfies readonly { value: RepeatKind; label: string }[];

interface ScheduleSheetProps {
  details: JobDetails;
  address: JobAddress;
}

interface ScheduleForm {
  isOpen: boolean;
  draft: ScheduleDraft;
  error: string | undefined;
  update: ReturnType<typeof useUpdateJob>;
  openOrClose: (isOpening: boolean) => void;
  change: (changes: Partial<ScheduleDraft>) => void;
  save: () => void;
}

function useScheduleForm({ details, address }: ScheduleSheetProps): ScheduleForm {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(() => draftFrom(details.schedule));
  const [error, setError] = useState<string | undefined>();
  const update = useUpdateJob(address);
  return {
    isOpen,
    draft,
    error,
    update,
    openOrClose: (isOpening): void => {
      setIsOpen(isOpening);
      if (!isOpening) return;
      setDraft(draftFrom(details.schedule));
      setError(undefined);
      update.reset();
    },
    change: (changes): void => {
      setDraft((current) => ({ ...current, ...changes }));
    },
    save: (): void => {
      const parsed = scheduleSchema.safeParse(scheduleFrom(draft));
      setError(parsed.success ? undefined : parsed.error.issues[0]?.message);
      if (!parsed.success) return;
      const close = (): void => {
        setIsOpen(false);
      };
      update.mutate({ schedule: parsed.data, version: details.version }, { onSuccess: close });
    },
  };
}

function KindFields({ form }: { form: ScheduleForm }): ReactNode {
  if (form.draft.kind === 'afterDone') {
    return <AfterDoneFields draft={form.draft} onChange={form.change} />;
  }
  if (form.draft.kind === 'weekdays') {
    return <WeekdayFields draft={form.draft} onChange={form.change} error={form.error} />;
  }
  return <MonthDayFields draft={form.draft} onChange={form.change} />;
}

function ScheduleFields({ form, details }: { form: ScheduleForm; details: JobDetails }): ReactNode {
  const { recommendedRange, recommendedSchedule } = details;
  return (
    <>
      <SegmentedControl<RepeatKind>
        label="Repeat"
        options={REPEAT_CHOICES}
        value={form.draft.kind}
        onValueChange={(kind) => {
          form.change({ kind });
        }}
      />
      <KindFields form={form} />
      {recommendedRange === null || recommendedSchedule === null ? null : (
        <Recommendation
          draft={form.draft}
          range={recommendedRange}
          recommended={recommendedSchedule}
          onUse={() => {
            form.change(draftFrom(recommendedSchedule));
          }}
        />
      )}
    </>
  );
}

export function ScheduleSheet(props: ScheduleSheetProps): ReactNode {
  const form = useScheduleForm(props);
  return (
    <BottomSheet
      title="How often"
      {...(props.details.recommendation === null
        ? {}
        : { description: props.details.recommendation })}
      open={form.isOpen}
      onOpenChange={form.openOrClose}
      trigger={
        <button type="button" className={`${TEXT_ACTION_CLASSES} self-start`}>
          Change how often
        </button>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          form.save();
        }}
      >
        <ScheduleFields form={form} details={props.details} />
        {form.update.error === null ? null : <FormAlert>{form.update.error.message}</FormAlert>}
        <Button type="submit" disabled={form.update.isPending}>
          {form.update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </BottomSheet>
  );
}
