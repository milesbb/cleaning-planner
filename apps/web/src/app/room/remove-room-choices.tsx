'use client';

import type { Room } from '@cleaning-planner/contracts/room';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { Button } from '@/components/ui/button';
import { countOf } from '@/lib/rooms';
import { useRemoveRoom } from './use-room-actions';

const FOR_EVERYONE = 'will be removed for everyone in this home. This can’t be undone.';

function removalWarning(roomName: string, jobCount: number): string {
  if (jobCount === 0) return `“${roomName}” ${FOR_EVERYONE}`;
  return `“${roomName}” and its ${countOf(jobCount, 'job')} ${FOR_EVERYONE}`;
}

interface RemoveRoomChoicesProps {
  householdId: string;
  room: Room;
  jobCount: number;
  onKeep: () => void;
}

export function RemoveRoomChoices({
  householdId,
  room,
  jobCount,
  onKeep,
}: RemoveRoomChoicesProps): ReactNode {
  const router = useRouter();
  const remove = useRemoveRoom({ householdId, roomId: room.id });
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[1.0625rem]">{removalWarning(room.name, jobCount)}</p>
      {remove.error === null ? null : <FormAlert>{remove.error.message}</FormAlert>}
      <Button
        variant="danger"
        disabled={remove.isPending}
        onClick={() => {
          remove.mutate(undefined, {
            onSuccess: () => {
              router.replace('/home');
            },
          });
        }}
      >
        {remove.isPending ? 'Removing…' : 'Remove'}
      </Button>
      <Button variant="secondary" onClick={onKeep}>
        Keep it
      </Button>
    </div>
  );
}
