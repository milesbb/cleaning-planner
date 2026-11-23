import type { RoomType } from '@cleaning-planner/schedule/library/types';
import type { ReactNode } from 'react';

const SIZE = 40;
const STROKE_WIDTH = 6;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTRE = SIZE / 2;

// Tailwind only sees whole class names, so each room's stroke is spelled out
// here, matching ROOM_APPEARANCE's colours in lib/rooms.ts.
const STROKE_BY_ROOM: Record<RoomType, string> = {
  kitchen: 'stroke-kitchen',
  laundry: 'stroke-laundry',
  bathroom: 'stroke-bathroom',
  bedroom: 'stroke-bedroom',
  livingRoom: 'stroke-living-room',
  hallway: 'stroke-whole-home',
  office: 'stroke-laundry',
  outdoor: 'stroke-living-room',
  wholeHome: 'stroke-whole-home',
};

interface UpToDateRingProps {
  room: RoomType;
  // The share of the room's jobs that aren't late, from 0 to 1.
  share: number;
}

// Decorative: the tile's own text says "7 of 8 up to date".
export function UpToDateRing({ room, share }: UpToDateRingProps): ReactNode {
  return (
    <svg
      data-testid="up-to-date-ring"
      data-share={String(share)}
      aria-hidden="true"
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${String(SIZE)} ${String(SIZE)}`}
      className="shrink-0 -rotate-90 rounded-full border-2 border-ink bg-card"
    >
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={RADIUS}
        fill="none"
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - share)}
        className={STROKE_BY_ROOM[room]}
      />
    </svg>
  );
}
