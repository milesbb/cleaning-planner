'use client';

import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { optimisticUpdate } from '@/lib/api/query-policy';
import { QUEUED_REQUEST_KEY } from '@/lib/api/queued-requests';
import type { QueuedRequest } from '@/lib/api/queued-requests';
import { agendaKey, homePath } from '@/lib/home/home-queries';
import { withJobMoved } from './move-job';
import type { JobMove } from './move-job';
import type { WeekRange } from './week-view';

const MOVE_FAILED = 'That didn’t move. Try again.';

export interface MoveContext {
  householdId: string;
  range: WeekRange;
}

interface MoveTap extends QueuedRequest {
  context: MoveContext;
  move: JobMove;
}

export interface MoveJob {
  move: (move: JobMove) => void;
  failure: string | null;
}

function weekKey({ householdId, range }: MoveContext): readonly unknown[] {
  return agendaKey(householdId, { ...range, person: null });
}

function snoozeRequest(context: MoveContext, move: JobMove): QueuedRequest {
  const jobPath = `${homePath(context.householdId)}/jobs/${encodeURIComponent(move.jobId)}`;
  return {
    method: 'POST',
    path: `${jobPath}/snooze`,
    body: { until: move.until, idempotencyKey: crypto.randomUUID() },
    response: 'jobProgress',
  };
}

const applyMove = (agenda: AgendaResponse, { move }: MoveTap): AgendaResponse =>
  withJobMoved(agenda, move);

// Moving a job is a snooze to the day picked. It shows at once, goes through the
// offline queue with one idempotency key per tap, and is put back with a message
// if the API says no.
export function useMoveJob(context: MoveContext | null): MoveJob {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string | null>(null);
  const mutation = useMutation<unknown, Error, MoveTap, { previous: AgendaResponse | undefined }>({
    mutationKey: QUEUED_REQUEST_KEY,
    onMutate: (tap) => optimisticUpdate(queryClient, weekKey(tap.context), applyMove).onMutate(tap),
    onError: (error, tap, previous): void => {
      optimisticUpdate(queryClient, weekKey(tap.context), applyMove).onError(error, tap, previous);
      setFailure(error.message || MOVE_FAILED);
    },
    onSettled: (_moved, _error, tap) =>
      queryClient.invalidateQueries({ queryKey: ['home', tap.context.householdId] }),
  });
  return {
    move: (move): void => {
      if (context === null) return;
      setFailure(null);
      mutation.mutate({ context, move, ...snoozeRequest(context, move) });
    },
    failure,
  };
}
