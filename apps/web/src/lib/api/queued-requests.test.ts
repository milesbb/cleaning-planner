import { QueryClient, dehydrate, hydrate, onlineManager } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from './api-client';
import type { ApiClient, ApiRequest } from './api-client';
import { QUEUED_REQUEST_KEY, keepsTrying, queueRequests } from './queued-requests';
import type { QueuedRequest } from './queued-requests';

const TICK: QueuedRequest = {
  method: 'POST',
  path: '/v1/households/home-1/jobs/job-1/completions',
  body: { outcome: 'done', completedOn: '2026-11-23', idempotencyKey: 'key-1' },
  response: 'jobProgress',
};

const UNDO: QueuedRequest = {
  method: 'DELETE',
  path: '/v1/households/home-1/jobs/job-1/completions/latest',
  body: { idempotencyKey: 'key-2' },
  response: 'jobProgress',
};

const SAVED_PROGRESS = {
  jobId: 'job-1',
  nextDueDate: '2026-11-30',
  snooze: null,
  latestCompletion: null,
};

function recordingClient(answer: () => Promise<unknown> = () => Promise.resolve(SAVED_PROGRESS)): {
  client: ApiClient;
  sent: ApiRequest<unknown>[];
} {
  const sent: ApiRequest<unknown>[] = [];
  return {
    sent,
    client: {
      request: <Result>(request: ApiRequest<Result>): Promise<Result> => {
        sent.push(request);
        return answer().then((value) => request.response.parse(value));
      },
    },
  };
}

function queueOn(client: ApiClient, onRefused = vi.fn()): QueryClient {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  queueRequests(queryClient, client, onRefused);
  return queryClient;
}

function send(queryClient: QueryClient, request: QueuedRequest): Promise<unknown> {
  return queryClient
    .getMutationCache()
    .build(queryClient, { mutationKey: QUEUED_REQUEST_KEY })
    .execute(request);
}

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('queueRequests', () => {
  it('sends a queued change to the API with its method, path and body', async () => {
    const { client, sent } = recordingClient();
    await send(queueOn(client), TICK).catch(() => undefined);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ method: 'POST', path: TICK.path, body: TICK.body });
  });

  it('sends changes one at a time, in the order they were made', async () => {
    const order: string[] = [];
    let finishFirst: () => void = () => undefined;
    const client: ApiClient = {
      request: <Result>(request: ApiRequest<Result>): Promise<Result> => {
        order.push(`start ${request.method}`);
        const answer =
          request.method === 'POST'
            ? new Promise<void>((resolve) => {
                finishFirst = resolve;
              })
            : Promise.resolve();
        return answer.then(() => {
          order.push(`end ${request.method}`);
          return request.response.parse(SAVED_PROGRESS);
        });
      },
    };
    const queryClient = queueOn(client);
    const tick = send(queryClient, TICK).catch(() => undefined);
    const undo = send(queryClient, UNDO).catch(() => undefined);
    await vi.waitFor(() => {
      expect(order).toEqual(['start POST']);
    });
    finishFirst();
    await Promise.all([tick, undo]);
    expect(order).toEqual(['start POST', 'end POST', 'start DELETE', 'end DELETE']);
  });

  it('sends a change made offline once the app is back online, even after a restart', async () => {
    onlineManager.setOnline(false);
    const before = queueOn(recordingClient().client);
    void send(before, TICK).catch(() => undefined);
    const savedOnDevice = structuredClone(dehydrate(before));

    const { client, sent } = recordingClient();
    const after = queueOn(client);
    hydrate(after, savedOnDevice);
    onlineManager.setOnline(true);
    await after.resumePausedMutations();
    expect(sent.map((request) => request.body)).toEqual([TICK.body]);
  });

  it('tells the person when a change made offline was refused, such as for a removed job', async () => {
    const onRefused = vi.fn();
    const { client } = recordingClient(() =>
      Promise.reject(new ApiRequestError('rejected', 'That job has been removed')),
    );
    await send(queueOn(client, onRefused), TICK).catch(() => undefined);
    expect(onRefused).toHaveBeenCalledWith('That job has been removed');
  });

  it('refreshes the home’s data after each change', async () => {
    const queryClient = queueOn(recordingClient().client);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await send(queryClient, TICK).catch(() => undefined);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['home'] });
  });
});

describe('keepsTrying', () => {
  it.each(['offline', 'timeout', 'unavailable'] as const)(
    'keeps trying a queued change after %s failures, however many',
    (kind) => {
      expect(keepsTrying(50, new ApiRequestError(kind, 'Try again'))).toBe(true);
    },
  );

  it.each(['rejected', 'signedOut', 'unexpected'] as const)('stops after a %s answer', (kind) => {
    expect(keepsTrying(0, new ApiRequestError(kind, 'No'))).toBe(false);
  });

  it('stops after an error that is not from the API', () => {
    expect(keepsTrying(0, new TypeError('bug'))).toBe(false);
  });
});
