'use client';

import type { Room } from '@cleaning-planner/contracts/room';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { PencilIcon } from '@/components/icons/interface-icons';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { RemoveRoomChoices } from './remove-room-choices';
import { RoomNameForm } from './room-name-form';

interface EditRoomSheetProps {
  householdId: string;
  room: Room;
  jobCount: number;
}

type SheetView = 'edit' | 'remove';

interface EditViewProps {
  householdId: string;
  room: Room;
  onSaved: () => void;
  onRemove: () => void;
}

function EditView({ householdId, room, onSaved, onRemove }: EditViewProps): ReactNode {
  return (
    <div className="flex flex-col gap-5">
      <RoomNameForm key={room.version} householdId={householdId} room={room} onSaved={onSaved} />
      <Button variant="danger" onClick={onRemove}>
        Remove room
      </Button>
    </div>
  );
}

export function EditRoomSheet({ householdId, room, jobCount }: EditRoomSheetProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<SheetView>('edit');
  const close = (): void => {
    setIsOpen(false);
  };
  return (
    <BottomSheet
      title={view === 'edit' ? 'Edit room' : 'Remove this room?'}
      open={isOpen}
      onOpenChange={(isOpening) => {
        setIsOpen(isOpening);
        setView('edit');
      }}
      trigger={<IconButton label="Edit room" icon={<PencilIcon />} />}
    >
      {view === 'edit' ? (
        <EditView
          householdId={householdId}
          room={room}
          onSaved={close}
          onRemove={() => {
            setView('remove');
          }}
        />
      ) : (
        <RemoveRoomChoices
          householdId={householdId}
          room={room}
          jobCount={jobCount}
          onKeep={() => {
            setView('edit');
          }}
        />
      )}
    </BottomSheet>
  );
}
