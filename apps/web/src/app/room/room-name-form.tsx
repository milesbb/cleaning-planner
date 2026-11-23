'use client';

import { displayNameSchema } from '@cleaning-planner/contracts/primitives';
import type { Room, UpdateRoomRequest } from '@cleaning-planner/contracts/room';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { isStaleRoom, useRefreshHome, useUpdateRoom } from './use-room-actions';

interface RoomNameFormProps {
  householdId: string;
  room: Room;
  onSaved: () => void;
}

interface RoomNameDraft {
  name: string;
  nameError: string | undefined;
  update: ReturnType<typeof useUpdateRoom>;
  setName: (name: string) => void;
  save: () => void;
}

function useRoomNameDraft({ householdId, room, onSaved }: RoomNameFormProps): RoomNameDraft {
  const [name, setName] = useState(room.name);
  const [nameError, setNameError] = useState<string | undefined>();
  const update = useUpdateRoom({ householdId, roomId: room.id });
  // The form remounts when the saved room's version arrives, which drops
  // mutate()'s own callbacks; the promise still settles. A failure is shown
  // from update.error.
  const saveName = async (changes: UpdateRoomRequest): Promise<void> => {
    try {
      await update.mutateAsync(changes);
      onSaved();
    } catch {
      return;
    }
  };
  return {
    name,
    nameError,
    update,
    setName,
    save: (): void => {
      const parsed = displayNameSchema.safeParse(name);
      setNameError(parsed.success ? undefined : parsed.error.issues[0]?.message);
      if (!parsed.success) return;
      if (parsed.data === room.name) {
        onSaved();
        return;
      }
      void saveName({ name: parsed.data, version: room.version });
    },
  };
}

function SaveProblem({ error, onReload }: { error: Error; onReload: () => void }): ReactNode {
  return (
    <div className="flex flex-col gap-3">
      <FormAlert>{error.message}</FormAlert>
      {isStaleRoom(error) ? (
        <Button variant="secondary" onClick={onReload}>
          Reload
        </Button>
      ) : null}
    </div>
  );
}

// Keyed by the room's version: Reload fetches the home, and the form starts
// again from the name someone else saved.
export function RoomNameForm(props: RoomNameFormProps): ReactNode {
  const draft = useRoomNameDraft(props);
  const refreshHome = useRefreshHome(props.householdId);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        draft.save();
      }}
    >
      <TextField
        label="Name"
        autoComplete="off"
        value={draft.name}
        error={draft.nameError}
        onChange={(event) => {
          draft.setName(event.target.value);
        }}
      />
      {draft.update.error === null ? null : (
        <SaveProblem error={draft.update.error} onReload={() => void refreshHome()} />
      )}
      <Button type="submit" disabled={draft.update.isPending}>
        {draft.update.isPending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}
