import { describeInterval } from '../interval';
import { KITCHEN_JOBS } from './kitchen';
import { LAUNDRY_JOBS } from './laundry';
import {
  BATHROOM_JOBS,
  BEDROOM_JOBS,
  HALLWAY_JOBS,
  LIVING_ROOM_JOBS,
  OFFICE_JOBS,
  OUTDOOR_JOBS,
} from './rooms';
import type { HomeFeature, LibraryJob, RecommendedRange, RoomType } from './types';
import { WHOLE_HOME_JOBS } from './whole-home';

export const JOB_LIBRARY: readonly LibraryJob[] = [
  ...KITCHEN_JOBS,
  ...LAUNDRY_JOBS,
  ...BATHROOM_JOBS,
  ...BEDROOM_JOBS,
  ...LIVING_ROOM_JOBS,
  ...HALLWAY_JOBS,
  ...OFFICE_JOBS,
  ...OUTDOOR_JOBS,
  ...WHOLE_HOME_JOBS,
];

export function findLibraryJob(id: string): LibraryJob | undefined {
  return JOB_LIBRARY.find((job) => job.id === id);
}

function isInHome(job: LibraryJob, rooms: readonly RoomType[]): boolean {
  return job.room === 'wholeHome' || rooms.includes(job.room);
}

function hasWhatItNeeds(job: LibraryJob, features: readonly HomeFeature[]): boolean {
  return job.needs === undefined || features.includes(job.needs);
}

export function suggestJobs(
  rooms: readonly RoomType[],
  features: readonly HomeFeature[],
): LibraryJob[] {
  return JOB_LIBRARY.filter((job) => isInHome(job, rooms) && hasWhatItNeeds(job, features));
}

export function recommendationText({ shortest, longest }: RecommendedRange): string {
  const shortestText = describeInterval(shortest);
  const longestText = describeInterval(longest);
  const range = shortestText === longestText ? shortestText : `${shortestText} to ${longestText}`;
  return `Most homes do this ${range}.`;
}
