import type { HomeFeature, JobIconKey, RoomType } from './types';

// The fixed lists the contracts validate against, kept apart from the library
// itself so the web app can check a room type without bundling every job's text.

export const ROOM_TYPES: readonly RoomType[] = [
  'kitchen',
  'laundry',
  'bathroom',
  'bedroom',
  'livingRoom',
  'hallway',
  'office',
  'outdoor',
  'wholeHome',
];

export const HOME_FEATURES: readonly HomeFeature[] = [
  'dishwasher',
  'washingMachine',
  'tumbleDryer',
  'oven',
  'extractorHood',
  'microwave',
  'kettle',
  'carpet',
  'hardFloor',
];

export const JOB_ICON_KEYS: readonly JobIconKey[] = [
  'dishwasher',
  'washer',
  'vacuum',
  'mop',
  'bed',
  'kettle',
  'oven',
  'fridge',
  'toilet',
  'shower',
  'sofa',
  'windows',
  'bins',
  'spray',
  'duster',
  'smokeAlarm',
  'microwave',
];
