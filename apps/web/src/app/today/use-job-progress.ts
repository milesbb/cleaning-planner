'use client';

import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import { addInterval } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { optimisticUpdate } from '@/lib/api/query-policy';
import { QUEUED_REQUEST_KEY } from '@/lib/api/queued-requests';
import type { QueuedRequest } from '@/lib/api/queued-requests';
import { agendaKey, homePath } from '@/lib/home/home-queries';
import type { AgendaRange } from '@/lib/home/home-queries';
import {
  findDueItem,
  withJobDone,
  withJobSkipped,
  withJobSnoozed,
  withJobUndone,
} from './agenda-changes';
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
  skip: (jobId: string) => void;
  snoozeADay: (jobId: string) => void;
  failure: string | null;
}

interface ProgressTap {
  context: ProgressContext;
  jobId: string;
  idempotencyKey: string;
}

// The tap goes through the offline queue as plain data, so it is sent even if the
// app closes first; the tap's own details let this screen show it at once.
interface QueuedTap extends QueuedRequest, ProgressTap {}

type ApplyChange = (agenda: AgendaResponse, tap: ProgressTap) => AgendaResponse;

const SAVE_FAILED = 'That didn’t save. Try again.';
const ONE_DAY = { value: 1, unit: 'day' } as const;

function dayAfter(day: CalendarDate): CalendarDate {
  return addInterval(day, ONE_DAY);
}

function jobPath({ context, jobId }: ProgressTap): string {
  return `${homePath(context.householdId)}/jobs/${encodeURIComponent(jobId)}`;
}

function completionRequest(tap: ProgressTap, outcome: 'done' | 'skipped'): QueuedRequest {
  return {
    method: 'POST',
    path: `${jobPath(tap)}/completions`,
    body: { outcome, completedOn: tap.context.today, idempotencyKey: tap.idempotencyKey },
    response: 'jobProgress',
  };
}

function snoozeADayRequest(tap: ProgressTap): QueuedRequest {
  return {
    method: 'POST',
    path: `${jobPath(tap)}/snooze`,
    body: { until: dayAfter(tap.context.today), idempotencyKey: tap.idempotencyKey },
    response: 'jobProgress',
  };
}

function undoRequest(tap: ProgressTap): QueuedRequest {
  return {
    method: 'DELETE',
    path: `${jobPath(tap)}/completions/latest`,
    body: { idempotencyKey: tap.idempotencyKey },
    response: 'jobProgress',
  };
}

// Shows the change at once, puts the agenda back if the server says no, and
// refreshes the home's data either way.
function useProgressMutation(
  apply: ApplyChange,
  onFailure: (message: string) => void,
): UseMutationResult<unknown, Error, QueuedTap> {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, QueuedTap, { previous: AgendaResponse | undefined }>({
    mutationKey: QUEUED_REQUEST_KEY,
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

const applyDone: ApplyChange = (agenda, { context: { today, myUserId }, jobId }) =>
  withJobDone(agenda, jobId, { today, doneBy: myUserId });

const applySkip: ApplyChange = (agenda, { jobId }) => withJobSkipped(agenda, jobId);

const applySnoozeADay: ApplyChange = (agenda, { context: { today }, jobId }) =>
  withJobSnoozed(agenda, jobId, dayAfter(today));

type SendTap = (
  mutation: UseMutationResult<unknown, Error, QueuedTap>,
  toQueuedRequest: (tap: ProgressTap) => QueuedRequest,
  jobId: string,
) => void;

function useSendTap(context: ProgressContext | null, clearFailure: () => void): SendTap {
  return (mutation, toQueuedRequest, jobId) => {
    if (context === null) return;
    clearFailure();
    const tap: ProgressTap = { context, jobId, idempotencyKey: crypto.randomUUID() };
    mutation.mutate({ ...tap, ...toQueuedRequest(tap) });
  };
}

// Ticking, undoing, skipping and snoozing show at once. Each tap gets its own
// idempotency key, so a retried request can't record the job twice.
export function useJobProgress(context: ProgressContext | null): JobProgress {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string | null>(null);
  const dueBeforeDone = useRef(new Map<string, DueItem | null>());
  const done = useProgressMutation(applyDone, setFailure);
  const undo = useProgressMutation(
    (agenda, { context: { today }, jobId }) =>
      withJobUndone(agenda, jobId, today, dueBeforeDone.current.get(jobId) ?? null),
    setFailure,
  );
  const skip = useProgressMutation(applySkip, setFailure);
  const snooze = useProgressMutation(applySnoozeADay, setFailure);
  const send = useSendTap(context, () => {
    setFailure(null);
  });
  return {
    markDone: (jobId): void => {
      const agenda =
        context === null
          ? undefined
          : queryClient.getQueryData<AgendaResponse>(agendaKey(context.householdId, context.range));
      dueBeforeDone.current.set(jobId, agenda === undefined ? null : findDueItem(agenda, jobId));
      send(done, (tap) => completionRequest(tap, 'done'), jobId);
    },
    undo: (jobId): void => {
      send(undo, undoRequest, jobId);
    },
    skip: (jobId): void => {
      send(skip, (tap) => completionRequest(tap, 'skipped'), jobId);
    },
    snoozeADay: (jobId): void => {
      send(snooze, snoozeADayRequest, jobId);
    },
    failure,
  };
}
