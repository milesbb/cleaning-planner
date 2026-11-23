'use client';

import type { Household, UpdateHouseholdRequest } from '@cleaning-planner/contracts/household';
import { displayNameSchema } from '@cleaning-planner/contracts/primitives';
import type { Weekday } from '@cleaning-planner/schedule/types';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert, TEXT_ACTION_CLASSES } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { useUpdateHome } from './use-home-settings-actions';

const USUAL_WEEK_STARTS: readonly Weekday[] = ['monday', 'saturday', 'sunday'];

export function weekdayName(weekday: Weekday): string {
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`;
}

function weekStartChoices(current: Weekday): { value: Weekday; label: string }[] {
  const weekdays = USUAL_WEEK_STARTS.includes(current)
    ? USUAL_WEEK_STARTS
    : [current, ...USUAL_WEEK_STARTS];
  return weekdays.map((weekday) => ({ value: weekday, label: weekdayName(weekday) }));
}

function timeZoneChoices(current: string): string[] {
  const known = Intl.supportedValuesOf('timeZone');
  return known.includes(current) ? known : [current, ...known];
}

interface HomeDetailsDraft {
  name: string;
  weekStartsOn: Weekday;
  timeZone: string;
}

function changesFrom(household: Household, draft: HomeDetailsDraft): UpdateHouseholdRequest {
  return {
    ...(draft.name === household.name ? {} : { name: draft.name }),
    ...(draft.weekStartsOn === household.weekStartsOn ? {} : { weekStartsOn: draft.weekStartsOn }),
    ...(draft.timeZone === household.timeZone ? {} : { timeZone: draft.timeZone }),
    version: household.version,
  };
}

function draftOf(household: Household): HomeDetailsDraft {
  const { name, weekStartsOn, timeZone } = household;
  return { name, weekStartsOn, timeZone };
}

interface DetailsFieldsProps {
  draft: HomeDetailsDraft;
  nameError: string | undefined;
  onChange: (changes: Partial<HomeDetailsDraft>) => void;
}

function DetailsFields({ draft, nameError, onChange }: DetailsFieldsProps): ReactNode {
  return (
    <>
      <TextField
        label="Name"
        autoComplete="off"
        value={draft.name}
        error={nameError}
        onChange={(event) => {
          onChange({ name: event.target.value });
        }}
      />
      <SegmentedControl<Weekday>
        label="Week starts on"
        options={weekStartChoices(draft.weekStartsOn)}
        value={draft.weekStartsOn}
        onValueChange={(weekStartsOn) => {
          onChange({ weekStartsOn });
        }}
      />
      <SelectField
        label="Time zone"
        value={draft.timeZone}
        onValueChange={(timeZone) => {
          onChange({ timeZone });
        }}
      >
        {timeZoneChoices(draft.timeZone).map((timeZone) => (
          <option key={timeZone} value={timeZone}>
            {timeZone}
          </option>
        ))}
      </SelectField>
    </>
  );
}

interface HomeDetailsForm {
  isOpen: boolean;
  draft: HomeDetailsDraft;
  nameError: string | undefined;
  update: ReturnType<typeof useUpdateHome>;
  openOrClose: (isOpening: boolean) => void;
  change: (changes: Partial<HomeDetailsDraft>) => void;
  save: () => void;
}

const VERSION_ONLY = 1;

function useHomeDetailsForm(household: Household): HomeDetailsForm {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(() => draftOf(household));
  const [nameError, setNameError] = useState<string | undefined>();
  const update = useUpdateHome(household.id);
  const close = (): void => {
    setIsOpen(false);
  };
  return {
    ...{ isOpen, draft, nameError, update },
    openOrClose: (isOpening): void => {
      setIsOpen(isOpening);
      if (!isOpening) return;
      setDraft(draftOf(household));
      setNameError(undefined);
      update.reset();
    },
    change: (changes): void => {
      setDraft((current) => ({ ...current, ...changes }));
    },
    save: (): void => {
      const name = displayNameSchema.safeParse(draft.name);
      setNameError(name.success ? undefined : name.error.issues[0]?.message);
      if (!name.success) return;
      const changes = changesFrom(household, { ...draft, name: name.data });
      if (Object.keys(changes).length === VERSION_ONLY) close();
      else update.mutate(changes, { onSuccess: close });
    },
  };
}

export function HomeDetailsSheet({ household }: { household: Household }): ReactNode {
  const { isOpen, draft, nameError, update, openOrClose, change, save } =
    useHomeDetailsForm(household);
  return (
    <BottomSheet
      title="Home details"
      open={isOpen}
      onOpenChange={openOrClose}
      trigger={
        <button type="button" className={`${TEXT_ACTION_CLASSES} self-start`}>
          Change home details
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
        <DetailsFields draft={draft} nameError={nameError} onChange={change} />
        {update.error === null ? null : <FormAlert>{update.error.message}</FormAlert>}
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </BottomSheet>
  );
}
