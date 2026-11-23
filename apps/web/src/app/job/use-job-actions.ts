'use client';

import { jobProgressSchema } from '@cleaning-planner/contracts/completion';
import type { JobProgress } from '@cleaning-planner/contracts/completion';
import { jobSchema } from '@cleaning-planner/contracts/job';
import type { Job, UpdateJobRequest } from '@cleaning-planner/contracts/job';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { NO_CONTENT } from '@/lib/api/api-client';
import type { ApiRequest } from '@/lib/api/api-client';
import { useApiClient } from '@/lib/api/api-provider';
import { homePath } from '@/lib/home/home-queries';

export interface JobAddress {
  householdId: string;
  jobId: string;
}

export type ProgressChange =
  | { kind: 'done'; today: CalendarDate }
  | { kind: 'skipped'; today: CalendarDate }
  | { kind: 'snooze'; until: CalendarDate };

function jobPath({ householdId, jobId }: JobAddress): string {
  return `${homePath(householdId)}/jobs/${encodeURIComponent(jobId)}`;
}

function useRefreshHome(householdId: string): () => Promise<void> {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['home', householdId] });
}

type ProgressRequest = ProgressChange & { idempotencyKey: string };

export interface ProgressActions {
  record: (change: ProgressChange) => void;
  isPending: boolean;
  error: Error | null;
  saved: ProgressChange | null;
}

function progressRequest(address: JobAddress, request: ProgressRequest): ApiRequest<JobProgress> {
  const { idempotencyKey } = request;
  if (request.kind === 'snooze') {
    return {
      method: 'POST',
      path: `${jobPath(address)}/snooze`,
      body: { until: request.until, idempotencyKey },
      response: jobProgressSchema,
    };
  }
  return {
    method: 'POST',
    path: `${jobPath(address)}/completions`,
    body: { outcome: request.kind, completedOn: request.today, idempotencyKey },
    response: jobProgressSchema,
  };
}

// Done, skip and snooze get one idempotency key per tap, made before the first
// try, so a retried request can't record the job twice.
export function useProgressChange(address: JobAddress): ProgressActions {
  const client = useApiClient();
  const refreshHome = useRefreshHome(address.householdId);
  const mutation = useMutation({
    mutationFn: (request: ProgressRequest) => client.request(progressRequest(address, request)),
    onSettled: refreshHome,
  });
  return {
    record: (change): void => {
      mutation.mutate({ ...change, idempotencyKey: crypto.randomUUID() });
    },
    isPending: mutation.isPending,
    error: mutation.error,
    saved: mutation.isSuccess ? mutation.variables : null,
  };
}

// Rename, how often and who does it: each sends the version it was read at.
export function useUpdateJob(address: JobAddress): UseMutationResult<Job, Error, UpdateJobRequest> {
  const client = useApiClient();
  const refreshHome = useRefreshHome(address.householdId);
  return useMutation({
    // A retry after a lost answer would fail the version check, so don't.
    retry: false,
    mutationFn: (changes: UpdateJobRequest) =>
      client.request({
        method: 'PATCH',
        path: jobPath(address),
        body: changes,
        response: jobSchema,
      }),
    onSuccess: refreshHome,
  });
}

export function useRemoveJob(address: JobAddress): UseMutationResult<undefined, Error, void> {
  const client = useApiClient();
  const refreshHome = useRefreshHome(address.householdId);
  return useMutation({
    retry: false,
    mutationFn: () =>
      client.request({ method: 'DELETE', path: jobPath(address), response: NO_CONTENT }),
    // Not waited for, so the screen leaves before the refreshed home no longer has the job.
    onSuccess: (): void => {
      void refreshHome();
    },
  });
}
