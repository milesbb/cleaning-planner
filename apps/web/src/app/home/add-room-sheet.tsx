'use client';

import { displayNameSchema } from '@cleaning-planner/contracts/primitives';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { PlusIcon } from '@/components/icons/interface-icons';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { SETUP_ROOM_NAMES } from '@/lib/setup/home-setup';
import type { SetupRoomType } from '@/lib/setup/home-setup';
import { useAddRoom } from './use-add-room';

const FIRST_CHOICE: SetupRoomType = 'bathroom';

function isSetupRoomType(value: string): value is SetupRoomType {
  return value in SETUP_ROOM_NAMES;
}

const ROOM_CHOICES = Object.entries(SETUP_ROOM_NAMES).flatMap(([value, label]) =>
  isSetupRoomType(value) ? [{ value, label }] : [],
);

// "Bathroom 2" when the home already has a bathroom.
export function suggestedRoomName(type: SetupRoomType, roomNames: readonly string[]): string {
  const baseName = SETUP_ROOM_NAMES[type];
  if (!roomNames.includes(baseName)) return baseName;
  let number = 2;
  while (roomNames.includes(`${baseName} ${String(number)}`)) number += 1;
  return `${baseName} ${String(number)}`;
}

interface AddRoomSheetProps {
  householdId: string;
  roomNames: readonly string[];
}

interface AddRoomForm {
  type: SetupRoomType;
  name: string;
  nameError: string | undefined;
  chooseType: (type: SetupRoomType) => void;
  setName: (name: string) => void;
  reset: () => void;
  validName: () => string | null;
}

function useAddRoomForm(roomNames: readonly string[]): AddRoomForm {
  const [type, setType] = useState<SetupRoomType>(FIRST_CHOICE);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  return {
    type,
    name,
    nameError,
    chooseType: (chosen): void => {
      setType(chosen);
      setName(suggestedRoomName(chosen, roomNames));
    },
    setName,
    reset: (): void => {
      setType(FIRST_CHOICE);
      setName(suggestedRoomName(FIRST_CHOICE, roomNames));
      setNameError(undefined);
    },
    validName: (): string | null => {
      const parsed = displayNameSchema.safeParse(name);
      setNameError(parsed.success ? undefined : parsed.error.issues[0]?.message);
      return parsed.success ? parsed.data : null;
    },
  };
}

interface AddRoomFieldsProps {
  form: AddRoomForm;
  addRoom: ReturnType<typeof useAddRoom>;
  onSubmit: () => void;
}

function AddRoomFields({ form, addRoom, onSubmit }: AddRoomFieldsProps): ReactNode {
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <SegmentedControl<SetupRoomType>
        label="Room"
        options={ROOM_CHOICES}
        value={form.type}
        onValueChange={form.chooseType}
      />
      <TextField
        label="Name"
        autoComplete="off"
        value={form.name}
        error={form.nameError}
        onChange={(event) => {
          form.setName(event.target.value);
        }}
      />
      {addRoom.error !== null && <FormAlert>{addRoom.error.message}</FormAlert>}
      <Button type="submit" disabled={addRoom.isPending}>
        {addRoom.isPending ? 'Adding…' : 'Add room'}
      </Button>
    </form>
  );
}

export function AddRoomSheet({ householdId, roomNames }: AddRoomSheetProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const form = useAddRoomForm(roomNames);
  const addRoom = useAddRoom(householdId);
  const openOrClose = (isOpening: boolean): void => {
    setIsOpen(isOpening);
    if (!isOpening) return;
    form.reset();
    addRoom.reset();
  };
  const submit = (): void => {
    const name = form.validName();
    if (name === null) return;
    addRoom.mutate(
      { type: form.type, name },
      {
        onSuccess: () => {
          setIsOpen(false);
        },
      },
    );
  };
  return (
    <BottomSheet
      title="Add a room"
      description="We’ll add the usual jobs for it. You can change them later."
      open={isOpen}
      onOpenChange={openOrClose}
      trigger={
        <Button variant="dashed">
          <PlusIcon />
          Add a room
        </Button>
      }
    >
      <AddRoomFields form={form} addRoom={addRoom} onSubmit={submit} />
    </BottomSheet>
  );
}
