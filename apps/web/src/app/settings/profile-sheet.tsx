'use client';

import { PERSON_COLOURS, displayNameSchema } from '@cleaning-planner/contracts/primitives';
import type { Profile, UpdateProfileRequest } from '@cleaning-planner/contracts/profile';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert, TEXT_ACTION_CLASSES } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import type { PersonColour } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { useUpdateProfile } from './use-settings-actions';

const COLOUR_CHOICES = PERSON_COLOURS.map((colour) => ({
  value: colour,
  label: `${colour.charAt(0).toUpperCase()}${colour.slice(1)}`,
}));

interface ProfileForm {
  isOpen: boolean;
  name: string;
  colour: PersonColour;
  nameError: string | undefined;
  update: ReturnType<typeof useUpdateProfile>;
  openOrClose: (isOpening: boolean) => void;
  setName: (name: string) => void;
  setColour: (colour: PersonColour) => void;
  save: () => void;
}

function changesFrom(profile: Profile, name: string, colour: PersonColour): UpdateProfileRequest {
  return {
    ...(name === profile.name ? {} : { name }),
    ...(colour === profile.colour ? {} : { colour }),
  };
}

function useProfileForm(profile: Profile): ProfileForm {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(profile.name);
  const [colour, setColour] = useState<PersonColour>(profile.colour);
  const [nameError, setNameError] = useState<string | undefined>();
  const update = useUpdateProfile();
  const close = (): void => {
    setIsOpen(false);
  };
  return {
    ...{ isOpen, name, colour, nameError, update, setName, setColour },
    openOrClose: (isOpening): void => {
      setIsOpen(isOpening);
      if (!isOpening) return;
      setName(profile.name);
      setColour(profile.colour);
      setNameError(undefined);
      update.reset();
    },
    save: (): void => {
      const parsed = displayNameSchema.safeParse(name);
      setNameError(parsed.success ? undefined : parsed.error.issues[0]?.message);
      if (!parsed.success) return;
      const changes = changesFrom(profile, parsed.data, colour);
      if (Object.keys(changes).length === 0) close();
      else update.mutate(changes, { onSuccess: close });
    },
  };
}

function ProfileFields({ form }: { form: ProfileForm }): ReactNode {
  return (
    <>
      <TextField
        label="Name"
        autoComplete="name"
        value={form.name}
        error={form.nameError}
        onChange={(event) => {
          form.setName(event.target.value);
        }}
      />
      <SegmentedControl<PersonColour>
        label="Colour"
        options={COLOUR_CHOICES}
        value={form.colour}
        onValueChange={form.setColour}
      />
      {form.update.error === null ? null : <FormAlert>{form.update.error.message}</FormAlert>}
    </>
  );
}

export function ProfileSheet({ profile }: { profile: Profile }): ReactNode {
  const form = useProfileForm(profile);
  return (
    <BottomSheet
      title="Your name and colour"
      description="This is how you show up for everyone you live with."
      open={form.isOpen}
      onOpenChange={form.openOrClose}
      trigger={
        <button type="button" className={TEXT_ACTION_CLASSES}>
          Change name and colour
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
        <ProfileFields form={form} />
        <Button type="submit" disabled={form.update.isPending}>
          {form.update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </BottomSheet>
  );
}
