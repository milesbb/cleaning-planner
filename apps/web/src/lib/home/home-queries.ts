'use client';

import { agendaSchema } from '@cleaning-planner/contracts/agenda';
import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import {
  householdSchema,
  householdSummarySchema,
  memberSchema,
} from '@cleaning-planner/contracts/household';
import type { Household, HouseholdSummary, Member } from '@cleaning-planner/contracts/household';
import { completionSchema, jobProgressSchema } from '@cleaning-planner/contracts/completion';
import type { CompletionRecord, JobProgress } from '@cleaning-planner/contracts/completion';
import { jobSchema } from '@cleaning-planner/contracts/job';
import type { Job } from '@cleaning-planner/contracts/job';
import { profileSchema } from '@cleaning-planner/contracts/profile';
import type { Profile } from '@cleaning-planner/contracts/profile';
import { roomSchema } from '@cleaning-planner/contracts/room';
import type { Room } from '@cleaning-planner/contracts/room';
import { z } from '@cleaning-planner/contracts/zod';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import type { QueryKey, UseQueryResult } from '@tanstack/react-query';
import { useApiQuery } from '../api/api-provider';

// The reads every signed-in screen shares, with one query key each so a
// change in one screen refreshes the others.

const NO_HOME = '';

export interface AgendaRange {
  from: CalendarDate;
  to: CalendarDate;
  person: string | null;
}

export function homePath(householdId: string): string {
  return `/v1/households/${encodeURIComponent(householdId)}`;
}

export function agendaKey(householdId: string, range: AgendaRange): QueryKey {
  return ['home', householdId, 'agenda', range.from, range.to, range.person ?? 'everyone'];
}

export function useMe(): UseQueryResult<Profile> {
  return useApiQuery(['me'], { method: 'GET', path: '/v1/me', response: profileSchema });
}

export function useHomes(): UseQueryResult<HouseholdSummary[]> {
  return useApiQuery(['homes'], {
    method: 'GET',
    path: '/v1/households',
    response: z.array(householdSummarySchema),
  });
}

function useHomeRead<Result>(
  householdId: string | null,
  part: string,
  response: z.ZodMiniType<Result>,
): UseQueryResult<Result> {
  const id = householdId ?? NO_HOME;
  const path = part === '' ? homePath(id) : `${homePath(id)}/${part}`;
  return useApiQuery(
    ['home', id, part],
    { method: 'GET', path, response },
    { isEnabled: householdId !== null },
  );
}

export function useHousehold(householdId: string | null): UseQueryResult<Household> {
  return useHomeRead(householdId, '', householdSchema);
}

export function useMembers(householdId: string | null): UseQueryResult<Member[]> {
  return useHomeRead(householdId, 'members', z.array(memberSchema));
}

export function useRooms(householdId: string | null): UseQueryResult<Room[]> {
  return useHomeRead(householdId, 'rooms', z.array(roomSchema));
}

export function useJobs(householdId: string | null): UseQueryResult<Job[]> {
  return useHomeRead(householdId, 'jobs', z.array(jobSchema));
}

export function useProgress(householdId: string | null): UseQueryResult<JobProgress[]> {
  return useHomeRead(householdId, 'progress', z.array(jobProgressSchema));
}

// A job's done and skipped days, newest first.
export function useJobHistory(
  householdId: string,
  jobId: string,
): UseQueryResult<CompletionRecord[]> {
  return useApiQuery(['home', householdId, 'history', jobId], {
    method: 'GET',
    path: `${homePath(householdId)}/jobs/${encodeURIComponent(jobId)}/completions`,
    response: z.array(completionSchema),
  });
}

export function useAgenda(
  householdId: string | null,
  range: AgendaRange | null,
): UseQueryResult<AgendaResponse> {
  const id = householdId ?? NO_HOME;
  const query = new URLSearchParams(
    range === null
      ? {}
      : {
          from: range.from,
          to: range.to,
          ...(range.person === null ? {} : { person: range.person }),
        },
  );
  return useApiQuery(
    range === null ? ['home', id, 'agenda'] : agendaKey(id, range),
    { method: 'GET', path: `${homePath(id)}/agenda?${query.toString()}`, response: agendaSchema },
    { isEnabled: householdId !== null && range !== null },
  );
}
