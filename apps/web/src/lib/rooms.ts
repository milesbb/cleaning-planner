import type { JobIconKey, RoomType } from '@cleaning-planner/schedule/library/types';

interface RoomAppearance {
  colourClass: string;
  icon: JobIconKey;
}

export const ROOM_APPEARANCE: Record<RoomType, RoomAppearance> = {
  kitchen: { colourClass: 'bg-kitchen', icon: 'kettle' },
  laundry: { colourClass: 'bg-laundry', icon: 'washer' },
  bathroom: { colourClass: 'bg-bathroom', icon: 'shower' },
  bedroom: { colourClass: 'bg-bedroom', icon: 'bed' },
  livingRoom: { colourClass: 'bg-living-room', icon: 'sofa' },
  hallway: { colourClass: 'bg-whole-home', icon: 'vacuum' },
  office: { colourClass: 'bg-laundry', icon: 'duster' },
  outdoor: { colourClass: 'bg-living-room', icon: 'bins' },
  wholeHome: { colourClass: 'bg-whole-home', icon: 'spray' },
};

export function countOf(count: number, singular: string, plural = `${singular}s`): string {
  return `${String(count)} ${count === 1 ? singular : plural}`;
}
