import type { CreateHouseholdRequest } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import type { NewRoom, Room } from '@cleaning-planner/contracts/room';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { suggestJobs } from '@cleaning-planner/schedule/library/job-library';
import type { HomeFeature, LibraryJob } from '@cleaning-planner/schedule/library/types';
import { spreadFirstDueDates } from '@cleaning-planner/schedule/spread';
import type { Schedule } from '@cleaning-planner/schedule/types';

export interface HomePlan {
  rooms: Room[];
  jobs: Job[];
}

type PlanRequest = Pick<CreateHouseholdRequest, 'rooms' | 'features'>;

const WHOLE_HOME_ROOM: NewRoom = { type: 'wholeHome', name: 'Whole home' };

function withWholeHome(rooms: readonly NewRoom[]): NewRoom[] {
  const hasWholeHome = rooms.some((room) => room.type === 'wholeHome');
  return hasWholeHome ? [...rooms] : [...rooms, WHOLE_HOME_ROOM];
}

function editableSchedule(schedule: Schedule): Job['schedule'] {
  if (schedule.type === 'floating') return { type: 'floating', every: { ...schedule.every } };
  if (schedule.on.kind === 'weekdays') {
    return { type: 'fixed', on: { kind: 'weekdays', weekdays: [...schedule.on.weekdays] } };
  }
  return { type: 'fixed', on: { ...schedule.on } };
}

function jobFromLibrary(
  libraryJob: LibraryJob,
  roomId: string,
  id: string,
): Omit<Job, 'startDate'> {
  return {
    id,
    roomId,
    libraryId: libraryJob.id,
    name: libraryJob.name,
    icon: libraryJob.icon,
    schedule: editableSchedule(libraryJob.defaultSchedule),
    assignment: { kind: 'takeTurns' },
    snooze: null,
    effortMinutes: libraryJob.effortMinutes,
    version: 1,
  };
}

export function planJobs(
  rooms: readonly Room[],
  features: readonly HomeFeature[],
  today: CalendarDate,
  newId: () => string,
): Job[] {
  const draftJobs = rooms.flatMap((room) =>
    suggestJobs([room.type], [...features, ...room.appliances]).map((libraryJob) =>
      jobFromLibrary(libraryJob, room.id, newId()),
    ),
  );
  const startDates = new Map(
    spreadFirstDueDates(draftJobs, today).map(({ jobId, startDate }) => [jobId, startDate]),
  );
  return draftJobs.map((job) => ({ ...job, startDate: startDates.get(job.id) ?? today }));
}

export function newRoom(room: NewRoom, order: number, newId: () => string): Room {
  return {
    id: newId(),
    type: room.type,
    name: room.name,
    order,
    appliances: [...(room.appliances ?? [])],
    version: 1,
  };
}

export function planHome(request: PlanRequest, today: CalendarDate, newId: () => string): HomePlan {
  const rooms = withWholeHome(request.rooms).map((room, order) => newRoom(room, order, newId));
  return { rooms, jobs: planJobs(rooms, request.features, today, newId) };
}
