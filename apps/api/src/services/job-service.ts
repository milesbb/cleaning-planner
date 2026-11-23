import type { Job, UpdateJobRequest } from '@cleaning-planner/contracts/job';
import type { CreateJobRequest } from '@cleaning-planner/contracts/job-request';
import { calendarDateInTimeZone } from '@cleaning-planner/schedule/time-zone';
import type { MembershipReader } from '../middlewares/membership';
import { Errors } from '../utils/errors';
import type { HouseholdStore } from './household-service';
import type { RoomStore } from './room-service';

export interface JobStore {
  listJobs: (householdId: string) => Promise<Job[]>;
  findJob: (householdId: string, jobId: string) => Promise<Job | null>;
  addJob: (householdId: string, job: Job) => Promise<void>;
  updateJob: (householdId: string, jobId: string, changes: UpdateJobRequest) => Promise<Job>;
  deleteJob: (householdId: string, jobId: string) => Promise<void>;
}

export interface JobService {
  listJobs: (householdId: string) => Promise<Job[]>;
  getJob: (householdId: string, jobId: string) => Promise<Job>;
  addJob: (householdId: string, request: CreateJobRequest) => Promise<Job>;
  updateJob: (householdId: string, jobId: string, changes: UpdateJobRequest) => Promise<Job>;
  deleteJob: (householdId: string, jobId: string) => Promise<void>;
}

interface JobServiceDependencies {
  store: JobStore;
  rooms: Pick<RoomStore, 'listRooms'>;
  households: Pick<HouseholdStore, 'getHousehold'>;
  memberships: MembershipReader;
  now: () => string;
  newId: () => string;
}

interface JobPlacement {
  roomId?: Job['roomId'] | undefined;
  assignment?: Job['assignment'] | undefined;
}

const NOT_SAVED = 'Check the highlighted fields';

async function checkPlacement(
  { rooms, memberships }: JobServiceDependencies,
  householdId: string,
  { roomId, assignment }: JobPlacement,
): Promise<void> {
  if (roomId !== undefined) {
    const homeRooms = await rooms.listRooms(householdId);
    if (!homeRooms.some((room) => room.id === roomId)) {
      throw Errors.badRequest(NOT_SAVED, { roomId: 'Pick a room in this home' });
    }
  }
  if (assignment?.kind === 'member') {
    const membership = await memberships.findMembership(householdId, assignment.memberId);
    if (membership === null) {
      throw Errors.badRequest(NOT_SAVED, { assignment: 'Pick someone who lives here' });
    }
  }
}

async function getJob(store: JobStore, householdId: string, jobId: string): Promise<Job> {
  const job = await store.findJob(householdId, jobId);
  if (job === null) throw Errors.notFound('No such job');
  return job;
}

async function addJob(
  dependencies: JobServiceDependencies,
  householdId: string,
  { libraryId, startDate, ...request }: CreateJobRequest,
): Promise<Job> {
  const household = await dependencies.households.getHousehold(householdId);
  if (household === null) throw Errors.notFound('No such home');
  await checkPlacement(dependencies, householdId, request);
  const job: Job = {
    ...request,
    id: dependencies.newId(),
    libraryId: libraryId ?? null,
    startDate: startDate ?? calendarDateInTimeZone(dependencies.now(), household.timeZone),
    snooze: null,
    version: 1,
  };
  await dependencies.store.addJob(householdId, job);
  return job;
}

async function updateJob(
  dependencies: JobServiceDependencies,
  householdId: string,
  jobId: string,
  changes: UpdateJobRequest,
): Promise<Job> {
  await checkPlacement(dependencies, householdId, changes);
  return dependencies.store.updateJob(householdId, jobId, changes);
}

export function createJobService(dependencies: JobServiceDependencies): JobService {
  const { store } = dependencies;
  return {
    listJobs: (householdId) => store.listJobs(householdId),
    getJob: (householdId, jobId) => getJob(store, householdId, jobId),
    addJob: (householdId, request) => addJob(dependencies, householdId, request),
    updateJob: (householdId, jobId, changes) =>
      updateJob(dependencies, householdId, jobId, changes),
    deleteJob: (householdId, jobId) => store.deleteJob(householdId, jobId),
  };
}
