import type { Job } from '@cleaning-planner/contracts/job';
import type { Room } from '@cleaning-planner/contracts/room';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { JOB_LIBRARY, findLibraryJob } from '@cleaning-planner/schedule/library/job-library';
import type { HomeFeature, RoomType } from '@cleaning-planner/schedule/library/types';
import { Errors } from '../utils/errors';
import { planJobs } from './home-plan';

export interface ApplianceChangeRequest {
  room: Room;
  roomJobs: readonly Job[];
  requested: readonly HomeFeature[];
  today: CalendarDate;
  newId: () => string;
}

export interface ApplianceChanges {
  jobsToAdd: Job[];
  jobIdsToRemove: string[];
}

export function appliancesForRoomType(roomType: RoomType): HomeFeature[] {
  const needed = JOB_LIBRARY.filter((libraryJob) => libraryJob.room === roomType).flatMap(
    (libraryJob) => (libraryJob.needs === undefined ? [] : [libraryJob.needs]),
  );
  return [...new Set(needed)];
}

function applianceNeededBy(job: Job): HomeFeature | undefined {
  return job.libraryId === null ? undefined : findLibraryJob(job.libraryId)?.needs;
}

// Rooms made in setup save no appliances (setup's are home-wide), so a room
// also has every appliance one of its library jobs needs.
export function roomWithItsAppliances(room: Room, jobs: readonly Job[]): Room {
  const needed = jobs
    .filter((job) => job.roomId === room.id)
    .flatMap((job) => applianceNeededBy(job) ?? []);
  const has = new Set([...room.appliances, ...needed]);
  return {
    ...room,
    appliances: appliancesForRoomType(room.type).filter((appliance) => has.has(appliance)),
  };
}

function checkAppliancesBelong(room: Room, requested: readonly HomeFeature[]): void {
  const offered = appliancesForRoomType(room.type);
  if (requested.some((appliance) => !offered.includes(appliance))) {
    throw Errors.badRequest('Check the highlighted fields', {
      appliances: 'Pick appliances that belong in this room',
    });
  }
}

// Ticking an appliance adds its library jobs the room doesn't have yet;
// unticking one removes the jobs that need it.
export function applianceChanges({
  room,
  roomJobs,
  requested,
  today,
  newId,
}: ApplianceChangeRequest): ApplianceChanges {
  checkAppliancesBelong(room, requested);
  const current = roomWithItsAppliances(room, roomJobs).appliances;
  const ticked = requested.filter((appliance) => !current.includes(appliance));
  const unticked = current.filter((appliance) => !requested.includes(appliance));
  const libraryIdsInRoom = new Set(roomJobs.map((job) => job.libraryId));
  const jobsToAdd = planJobs([{ ...room, appliances: ticked }], [], today, newId).filter((job) => {
    const needed = applianceNeededBy(job);
    return needed !== undefined && ticked.includes(needed) && !libraryIdsInRoom.has(job.libraryId);
  });
  const jobIdsToRemove = roomJobs
    .filter((job) => {
      const needed = applianceNeededBy(job);
      return needed !== undefined && unticked.includes(needed);
    })
    .map((job) => job.id);
  return { jobsToAdd, jobIdsToRemove };
}
