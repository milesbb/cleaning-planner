import type { Interval, Schedule } from '../types';

export type RoomType =
  | 'kitchen'
  | 'laundry'
  | 'bathroom'
  | 'bedroom'
  | 'livingRoom'
  | 'hallway'
  | 'office'
  | 'outdoor'
  | 'wholeHome';

export type HomeFeature =
  | 'dishwasher'
  | 'washingMachine'
  | 'tumbleDryer'
  | 'oven'
  | 'extractorHood'
  | 'microwave'
  | 'kettle'
  | 'carpet'
  | 'hardFloor';

export type JobIconKey =
  | 'dishwasher'
  | 'washer'
  | 'vacuum'
  | 'mop'
  | 'bed'
  | 'kettle'
  | 'oven'
  | 'fridge'
  | 'toilet'
  | 'shower'
  | 'sofa'
  | 'windows'
  | 'bins'
  | 'spray'
  | 'duster'
  | 'smokeAlarm'
  | 'microwave';

export interface RecommendedRange {
  shortest: Interval;
  longest: Interval;
}

export interface LibraryJob {
  id: string;
  name: string;
  room: RoomType;
  icon: JobIconKey;
  needs?: HomeFeature;
  defaultSchedule: Schedule;
  recommendedRange: RecommendedRange;
  effortMinutes: number;
  howTo: readonly string[];
  why: string;
  sources: readonly string[];
}
