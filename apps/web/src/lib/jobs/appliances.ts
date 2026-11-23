import type { HomeFeature, RoomType } from '@cleaning-planner/schedule/library/types';

export interface ApplianceChoice {
  value: HomeFeature;
  label: string;
}

const APPLIANCE_LABELS: Record<HomeFeature, string> = {
  dishwasher: 'Dishwasher',
  oven: 'Oven',
  extractorHood: 'Extractor hood',
  kettle: 'Kettle',
  microwave: 'Microwave',
  washingMachine: 'Washing machine',
  tumbleDryer: 'Tumble dryer',
  carpet: 'Carpet',
  hardFloor: 'Hard floors',
};

// The library's own list, kept here so screens don't load the library's text;
// a test keeps the two the same.
const ROOM_APPLIANCES: Partial<Record<RoomType, readonly HomeFeature[]>> = {
  kitchen: ['dishwasher', 'oven', 'extractorHood', 'kettle', 'microwave'],
  laundry: ['washingMachine', 'tumbleDryer'],
  wholeHome: ['carpet', 'hardFloor'],
};

export function appliancesInRoom(roomType: RoomType): readonly HomeFeature[] {
  return ROOM_APPLIANCES[roomType] ?? [];
}

export function applianceChoicesFor(roomType: RoomType): ApplianceChoice[] {
  return appliancesInRoom(roomType).map((value) => ({ value, label: APPLIANCE_LABELS[value] }));
}
