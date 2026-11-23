'use client';

import type { ReactNode } from 'react';
import { IconTile } from '@/components/jobs/icon-tile';
import { Card } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import { Switch } from '@/components/ui/switch';
import { ROOM_APPEARANCE } from '@/lib/rooms';
import { SETUP_ROOM_NAMES } from '@/lib/setup/home-setup';
import type { HomeSetup, SetupRoomType } from '@/lib/setup/home-setup';

type RoomCounts = HomeSetup['roomCounts'];

// Bathrooms and bedrooms are counted; every other room is there or not.
const COUNTED_ROOMS: Partial<Record<SetupRoomType, { label: string; maximum: number }>> = {
  bathroom: { label: 'Bathrooms', maximum: 6 },
  bedroom: { label: 'Bedrooms', maximum: 8 },
};

const ROOM_ORDER: readonly SetupRoomType[] = [
  'kitchen',
  'bathroom',
  'bedroom',
  'livingRoom',
  'laundry',
  'hallway',
  'office',
  'outdoor',
];

interface RoomChoiceProps {
  type: SetupRoomType;
  count: number;
  onCountChange: (count: number) => void;
}

function RoomChoice({ type, count, onCountChange }: RoomChoiceProps): ReactNode {
  const appearance = ROOM_APPEARANCE[type];
  const counted = COUNTED_ROOMS[type];
  return (
    <Card raised={false} className="flex items-center gap-3 py-3">
      <IconTile
        icon={appearance.icon}
        colourClass={appearance.colourClass}
        className="hidden min-[360px]:flex"
      />
      {counted === undefined ? (
        <Switch
          label={SETUP_ROOM_NAMES[type]}
          checked={count > 0}
          onCheckedChange={(isChecked) => {
            onCountChange(isChecked ? 1 : 0);
          }}
          className="flex-1"
        />
      ) : (
        <Stepper
          label={counted.label}
          value={count}
          minimum={0}
          maximum={counted.maximum}
          onValueChange={onCountChange}
          className="flex-1"
        />
      )}
    </Card>
  );
}

interface RoomChoicesProps {
  roomCounts: RoomCounts;
  onChange: (roomCounts: RoomCounts) => void;
}

export function RoomChoices({ roomCounts, onChange }: RoomChoicesProps): ReactNode {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 font-display text-xl font-extrabold">Rooms</legend>
      <div className="flex flex-col gap-3">
        {ROOM_ORDER.map((type) => (
          <RoomChoice
            key={type}
            type={type}
            count={roomCounts[type]}
            onCountChange={(count) => {
              onChange({ ...roomCounts, [type]: count });
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}
