'use client';

import type { Room } from '@cleaning-planner/contracts/room';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import type { SheetOpening } from '@/lib/lazy-sheet';
import { RemoveRoomChoices } from './remove-room-choices';
import { RoomDetailsForm } from './room-details-form';

interface EditRoomSheetProps extends SheetOpening {
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
      <RoomDetailsForm key={room.version} householdId={householdId} room={room} onSaved={onSaved} />
      <Button variant="danger" onClick={onRemove}>
        Remove room
      </Button>
    </div>
  );
}

// Loaded on first use (`EditRoomButton`), and fresh each time it opens.
export function EditRoomSheet(props: EditRoomSheetProps): ReactNode {
  const { householdId, room, jobCount, onOpenChange } = props;
  const [view, setView] = useState<SheetView>('edit');
  const close = (): void => {
    onOpenChange(false);
  };
  return (
    <BottomSheet
      title={view === 'edit' ? 'Edit room' : 'Remove this room?'}
      size="wide"
      open={props.open}
      onOpenChange={onOpenChange}
      returnFocusTo={props.returnFocusTo}
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
