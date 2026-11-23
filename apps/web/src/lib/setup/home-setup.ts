import type { CreateHouseholdRequest } from '@cleaning-planner/contracts/household';
import { timeZoneSchema } from '@cleaning-planner/contracts/primitives';
import type { NewRoom } from '@cleaning-planner/contracts/room';
import type { HomeFeature, RoomType } from '@cleaning-planner/schedule/library/types';
import type { Weekday } from '@cleaning-planner/schedule/types';

// The API adds the "Whole home" room to every home, so setup never offers it.
export type SetupRoomType = Exclude<RoomType, 'wholeHome'>;
export type ReminderTime = 'morning' | 'evening' | 'none';

export interface HomeSetup {
  homeName: string;
  roomCounts: Record<SetupRoomType, number>;
  features: HomeFeature[];
  weekStartsOn: Weekday;
  reminderTime: ReminderTime;
}

export const SETUP_ROOM_NAMES: Record<SetupRoomType, string> = {
  kitchen: 'Kitchen',
  laundry: 'Laundry',
  bathroom: 'Bathroom',
  bedroom: 'Bedroom',
  livingRoom: 'Living room',
  hallway: 'Hallway',
  office: 'Office',
  outdoor: 'Outdoor',
};

const SETUP_ROOM_TYPES: readonly SetupRoomType[] = [
  'kitchen',
  'laundry',
  'bathroom',
  'bedroom',
  'livingRoom',
  'hallway',
  'office',
  'outdoor',
];

const FALLBACK_TIME_ZONE = 'UTC';

export const DEFAULT_HOME_SETUP: HomeSetup = {
  homeName: 'Home',
  roomCounts: {
    kitchen: 1,
    laundry: 0,
    bathroom: 1,
    bedroom: 1,
    livingRoom: 1,
    hallway: 0,
    office: 0,
    outdoor: 0,
  },
  features: ['oven', 'kettle', 'washingMachine', 'hardFloor'],
  weekStartsOn: 'monday',
  reminderTime: 'morning',
};

function roomsOfType(type: SetupRoomType, count: number): NewRoom[] {
  const baseName = SETUP_ROOM_NAMES[type];
  return Array.from({ length: count }, (_, index) => ({
    type,
    name: index === 0 ? baseName : `${baseName} ${String(index + 1)}`,
  }));
}

export function createHouseholdRequestFor(
  setup: HomeSetup,
  timeZone: string,
): CreateHouseholdRequest {
  return {
    name: setup.homeName.trim(),
    timeZone,
    weekStartsOn: setup.weekStartsOn,
    rooms: SETUP_ROOM_TYPES.flatMap((type) => roomsOfType(type, setup.roomCounts[type])),
    features: setup.features,
  };
}

export function roomsError(roomCounts: HomeSetup['roomCounts']): string | undefined {
  const roomCount = Object.values(roomCounts).reduce((total, count) => total + count, 0);
  return roomCount === 0 ? 'Pick at least one room' : undefined;
}

function deviceTimeZone(): string | undefined {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function homeTimeZone(readTimeZone: () => string | undefined = deviceTimeZone): string {
  const parsed = timeZoneSchema.safeParse(readTimeZone());
  return parsed.success ? parsed.data : FALLBACK_TIME_ZONE;
}
