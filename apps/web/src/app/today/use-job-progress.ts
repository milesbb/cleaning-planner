'use client';

import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import { jobProgressSchema } from '@cleaning-planner/contracts/completion';
import type { JobProgress as SavedProgress } from '@cleaning-planner/contracts/completion';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { ApiRequest } from '@/lib/api/api-client';
import { useApiClient } from '@/lib/api/api-provider';
import { optimisticUpdate } from '@/lib/api/query-policy';
import { agendaKey, homePath } from '@/lib/home/home-queries';
import type { AgendaRange } from '@/lib/home/home-queries';
import { findDueItem, withJobDone, withJobUndone } from './agenda-changes';
import type { DueItem } from './agenda-changes';

export interface ProgressContext {
  householdId: string;
  range: AgendaRange;
  myUserId: string;
  today: CalendarDate;
}

export interface JobProgress {
  markDone: (jobId: string) => void;
  undo: (jobId: string) => void;
  failure: string | null;
}

interface ProgressRequest {
  context: ProgressContext;
  jobId: string;
  idempotencyKey: string;
}

type ApplyChange = (agenda: AgendaResponse, request: ProgressRequest) => AgendaResponse;

const SAVE_FAILED = 'That didn’t save. Try again.';

function jobPath({ context, jobId }: ProgressRequest): string {
  return `${homePath(context.householdId)}/jobs/${encodeURIComponent(jobId)}`;
}

function doneRequest(request: ProgressRequest): ApiRequest<SavedProgress> {
  return {
    method: 'POST',
    path: `${jobPath(request)}/completions`,
    body: {
      outcome: 'done',
      completedOn: request.context.today,
      idempotencyKey: request.idempotencyKey,
    },
    response: jobProgressSchema,
  };
}

function undoRequest(request: ProgressRequest): ApiRequest<SavedProgress> {
  return {
    method: 'DELETE',
    path: `${jobPath(request)}/completions/latest`,
    body: { idempotencyKey: request.idempotencyKey },
    response: jobProgressSchema,
  };
}

// Shows the change at once, puts the agenda back if the server says no, and
// refreshes the home's data either way.
function useProgressMutation(
  toApiRequest: (request: ProgressRequest) => ApiRequest<SavedProgress>,
  apply: ApplyChange,
  onFailure: (message: string) => void,
): UseMutationResult<SavedProgress, Error, ProgressRequest> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ProgressRequest) => client.request(toApiRequest(request)),
    onMutate: (request) =>
      optimisticUpdate(
        queryClient,
        agendaKey(request.context.householdId, request.context.range),
        apply,
      ).onMutate(request),
    onError: (error, request, previous): void => {
      const { householdId, range } = request.context;
      optimisticUpdate(queryClient, agendaKey(householdId, range), apply).onError(
        error,
        request,
        previous,
      );
      onFailure(error.message || SAVE_FAILED);
    },
    onSettled: (_saved, _error, request) =>
      queryClient.invalidateQueries({ queryKey: ['home', request.context.householdId] }),
  });
}

// One tap marks a job done or undoes it. The idempotency key is made once per
// tap, so a retried request can't record the job twice.
export function useJobProgress(context: ProgressContext | null): JobProgress {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string | null>(null);
  const dueBeforeDone = useRef(new Map<string, DueItem | null>());
  const done = useProgressMutation(
    doneRequest,
    (agenda, { context: { today, myUserId }, jobId }) =>
      withJobDone(agenda, jobId, { today, doneBy: myUserId }),
    setFailure,
  );
  const undo = useProgressMutation(
    undoRequest,
    (agenda, { context: { today }, jobId }) =>
      withJobUndone(agenda, jobId, today, dueBeforeDone.current.get(jobId) ?? null),
    setFailure,
  );
  const send = (mutation: typeof done, jobId: string): void => {
    if (context === null) return;
    setFailure(null);
    mutation.mutate({ context, jobId, idempotencyKey: crypto.randomUUID() });
  };
  return {
    markDone: (jobId): void => {
      const agenda =
        context === null
          ? undefined
          : queryClient.getQueryData<AgendaResponse>(agendaKey(context.householdId, context.range));
      dueBeforeDone.current.set(jobId, agenda === undefined ? null : findDueItem(agenda, jobId));
      send(done, jobId);
    },
    undo: (jobId): void => {
      send(undo, jobId);
    },
    failure,
  };
}
