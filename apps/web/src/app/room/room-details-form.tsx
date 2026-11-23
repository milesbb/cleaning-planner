'use client';

import { displayNameSchema } from '@cleaning-planner/contracts/primitives';
import type { Room, UpdateRoomRequest } from '@cleaning-planner/contracts/room';
import type { HomeFeature } from '@cleaning-planner/schedule/library/types';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { Button } from '@/components/ui/button';
import { CheckboxGroup } from '@/components/ui/checkbox-group';
import { TextField } from '@/components/ui/text-field';
import { applianceChoicesFor } from '@/lib/jobs/appliances';
import { isStaleRoom, useRefreshHome, useUpdateRoom } from './use-room-actions';

interface RoomDetailsFormProps {
  householdId: string;
  room: Room;
  onSaved: () => void;
}

type RoomChanges = Omit<UpdateRoomRequest, 'version'>;

function isSameList(first: readonly string[], second: readonly string[]): boolean {
  return first.join() === second.join();
}

// Only what changed is sent, so a save never repeats someone else's old values.
function changesTo(room: Room, name: string, appliances: HomeFeature[]): RoomChanges {
  return {
    ...(name === room.name ? {} : { name }),
    ...(isSameList(appliances, room.appliances) ? {} : { appliances }),
  };
}

interface RoomDetailsDraft {
  name: string;
  nameError: string | undefined;
  appliances: HomeFeature[];
  update: ReturnType<typeof useUpdateRoom>;
  setName: (name: string) => void;
  setAppliances: (appliances: HomeFeature[]) => void;
  save: () => void;
}

function useRoomDetailsDraft({
  householdId,
  room,
  onSaved,
}: RoomDetailsFormProps): RoomDetailsDraft {
  const [name, setName] = useState(room.name);
  const [nameError, setNameError] = useState<string | undefined>();
  const [appliances, setAppliances] = useState<HomeFeature[]>([...room.appliances]);
  const update = useUpdateRoom({ householdId, roomId: room.id });
  // The form remounts when the saved room's version arrives, which drops
  // mutate()'s own callbacks; the promise still settles. A failure is shown
  // from update.error.
  const send = async (changes: UpdateRoomRequest): Promise<void> => {
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
    appliances,
    update,
    setName,
    setAppliances,
    save: (): void => {
      const parsed = displayNameSchema.safeParse(name);
      setNameError(parsed.success ? undefined : parsed.error.issues[0]?.message);
      if (!parsed.success) return;
      const changes = changesTo(room, parsed.data, appliances);
      if (Object.keys(changes).length === 0) {
        onSaved();
        return;
      }
      void send({ ...changes, version: room.version });
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

function AppliancesField({ room, draft }: { room: Room; draft: RoomDetailsDraft }): ReactNode {
  const choices = applianceChoicesFor(room.type);
  if (choices.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <CheckboxGroup
        label="Appliances"
        options={choices}
        values={draft.appliances}
        onValuesChange={draft.setAppliances}
      />
      <p className="text-[0.9375rem]">
        Ticking one adds its usual jobs. Unticking one removes its jobs from this room.
      </p>
    </div>
  );
}

// Keyed by the room's version: Reload fetches the home, and the form starts
// again from what someone else saved.
export function RoomDetailsForm(props: RoomDetailsFormProps): ReactNode {
  const draft = useRoomDetailsDraft(props);
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
      <AppliancesField room={props.room} draft={draft} />
      {draft.update.error === null ? null : (
        <SaveProblem error={draft.update.error} onReload={() => void refreshHome()} />
      )}
      <Button type="submit" disabled={draft.update.isPending}>
        {draft.update.isPending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}
