'use client';

import type { Room } from '@cleaning-planner/contracts/room';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { ChevronDownIcon } from '@/components/icons/interface-icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { movedRoomIds, positionsToSave } from './room-order';
import type { MoveDirection } from './room-order';
import { useReorderRooms } from './use-reorder-rooms';

interface ReorderRoomsProps {
  householdId: string;
  rooms: readonly Room[];
  onDone: () => void;
}

interface MoveButtonProps {
  room: Room;
  direction: MoveDirection;
  isAvailable: boolean;
  onMove: (room: Room, direction: MoveDirection) => void;
}

// aria-disabled rather than disabled, so focus stays on the button after a move.
function MoveButton({ room, direction, isAvailable, onMove }: MoveButtonProps): ReactNode {
  return (
    <IconButton
      label={`Move ${room.name} ${direction}`}
      icon={direction === 'up' ? <ChevronDownIcon className="rotate-180" /> : <ChevronDownIcon />}
      aria-disabled={!isAvailable}
      className="aria-disabled:opacity-50"
      onClick={() => {
        if (isAvailable) onMove(room, direction);
      }}
    />
  );
}

interface RoomOrder {
  orderedRooms: Room[];
  announcement: string;
  reorder: ReturnType<typeof useReorderRooms>;
  move: (room: Room, direction: MoveDirection) => void;
}

function useRoomOrder({ householdId, rooms }: ReorderRoomsProps): RoomOrder {
  const reorder = useReorderRooms(householdId);
  const [movedIds, setMovedIds] = useState<string[] | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const shownIds = movedIds ?? rooms.map((room) => room.id);
  const orderedRooms = shownIds.flatMap((id) => rooms.filter((room) => room.id === id));
  return {
    orderedRooms,
    announcement,
    reorder,
    move: (room, direction): void => {
      const nextIds = movedRoomIds(shownIds, room.id, direction);
      setMovedIds(nextIds);
      setAnnouncement(
        `${room.name} is now ${String(nextIds.indexOf(room.id) + 1)} of ${String(nextIds.length)}`,
      );
      reorder.mutate(positionsToSave(rooms, nextIds), {
        onSettled: () => {
          setMovedIds(null);
        },
      });
    },
  };
}

export function ReorderRooms(props: ReorderRoomsProps): ReactNode {
  const { orderedRooms, announcement, reorder, move } = useRoomOrder(props);
  const isSaving = reorder.isPending;
  const lastIndex = orderedRooms.length - 1;
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {reorder.error === null ? null : (
        <FormAlert>{`The new order wasn’t saved. ${reorder.error.message}`}</FormAlert>
      )}
      <ol aria-label="Room order" className="flex flex-col gap-2.5">
        {orderedRooms.map((room, index) => (
          <li key={room.id}>
            <Card raised={false} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 text-lg font-bold break-words">{room.name}</span>
              <MoveButton
                room={room}
                direction="up"
                isAvailable={!isSaving && index > 0}
                onMove={move}
              />
              <MoveButton
                room={room}
                direction="down"
                isAvailable={!isSaving && index < lastIndex}
                onMove={move}
              />
            </Card>
          </li>
        ))}
      </ol>
      <Button onClick={props.onDone}>Done</Button>
    </div>
  );
}
