import type { AgendaQuery, AgendaResponse } from '@cleaning-planner/contracts/agenda';
import type { CompletionRecord } from '@cleaning-planner/contracts/completion';
import type { Job } from '@cleaning-planner/contracts/job';
import { buildAgenda } from '@cleaning-planner/schedule/agenda';
import type { AgendaJob } from '@cleaning-planner/schedule/agenda';
import { calendarDateInTimeZone } from '@cleaning-planner/schedule/time-zone';
import { Errors } from '../utils/errors';
import type { HouseholdStore } from './household-service';
import type { JobStore } from './job-service';
import type { MemberStore } from './member-service';

export interface HomeCompletionStore {
  listHomeCompletions: (householdId: string) => Promise<CompletionRecord[]>;
}

export interface AgendaService {
  getAgenda: (householdId: string, query: AgendaQuery) => Promise<AgendaResponse>;
}

interface AgendaDependencies {
  households: Pick<HouseholdStore, 'getHousehold'>;
  jobs: Pick<JobStore, 'listJobs'>;
  members: Pick<MemberStore, 'listMembers'>;
  completions: HomeCompletionStore;
  now: () => string;
}

function agendaJobsFrom(
  jobs: readonly Job[],
  completions: readonly CompletionRecord[],
): AgendaJob[] {
  return jobs.map((job) => ({
    id: job.id,
    schedule: job.schedule,
    startDate: job.startDate,
    assignment: job.assignment,
    completions: completions.filter((completion) => completion.jobId === job.id),
    ...(job.snooze === null ? {} : { snooze: job.snooze }),
  }));
}

async function getAgenda(
  { households, jobs, members, completions, now }: AgendaDependencies,
  householdId: string,
  { from, to, person }: AgendaQuery,
): Promise<AgendaResponse> {
  const [household, homeJobs, homeMembers, history] = await Promise.all([
    households.getHousehold(householdId),
    jobs.listJobs(householdId),
    members.listMembers(householdId),
    completions.listHomeCompletions(householdId),
  ]);
  if (household === null) throw Errors.notFound('No such home');
  const memberIds = homeMembers.map((member) => member.userId);
  if (person !== undefined && !memberIds.includes(person)) {
    throw Errors.badRequest('Check the highlighted fields', {
      person: 'Pick someone who lives here',
    });
  }
  return buildAgenda({
    jobs: agendaJobsFrom(homeJobs, history),
    memberIds,
    today: calendarDateInTimeZone(now(), household.timeZone),
    weekStartsOn: household.weekStartsOn,
    range: { from, to },
    ...(person === undefined ? {} : { person }),
  });
}

export function createAgendaService(dependencies: AgendaDependencies): AgendaService {
  return {
    getAgenda: (householdId, query) => getAgenda(dependencies, householdId, query),
  };
}
