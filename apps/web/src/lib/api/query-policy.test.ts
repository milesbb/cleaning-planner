import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from './api-client';
import type { ApiFailureKind } from './api-client';
import { optimisticUpdate, shouldRetry } from './query-policy';

function failure(kind: ApiFailureKind): ApiRequestError {
  return new ApiRequestError(kind, 'message');
}

describe('shouldRetry', () => {
  it.each<ApiFailureKind>(['offline', 'timeout', 'unavailable'])('retries %s twice', (kind) => {
    expect(shouldRetry(0, failure(kind))).toBe(true);
    expect(shouldRetry(1, failure(kind))).toBe(true);
    expect(shouldRetry(2, failure(kind))).toBe(false);
  });

  it.each<ApiFailureKind>(['signedOut', 'rejected', 'unexpected'])('never retries %s', (kind) => {
    expect(shouldRetry(0, failure(kind))).toBe(false);
  });

  it('never retries a programming error', () => {
    expect(shouldRetry(0, new Error('API paths start with /v1/'))).toBe(false);
  });
});

describe('optimisticUpdate', () => {
  const ROOMS_KEY = ['rooms', 'home-1'];

  it('shows the change at once and puts things back if it fails', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(ROOMS_KEY, ['Kitchen']);
    const handlers = optimisticUpdate<string[], string>(queryClient, ROOMS_KEY, (rooms, name) => [
      ...rooms,
      name,
    ]);
    const context = await handlers.onMutate('Study');
    expect(queryClient.getQueryData(ROOMS_KEY)).toEqual(['Kitchen', 'Study']);
    handlers.onError(new Error('offline'), 'Study', context);
    expect(queryClient.getQueryData(ROOMS_KEY)).toEqual(['Kitchen']);
  });

  it('leaves nothing cached when there was nothing to change', async () => {
    const queryClient = new QueryClient();
    const handlers = optimisticUpdate<string[], string>(queryClient, ROOMS_KEY, (rooms, name) => [
      ...rooms,
      name,
    ]);
    const context = await handlers.onMutate('Study');
    handlers.onError(new Error('offline'), 'Study', context);
    expect(queryClient.getQueryData(ROOMS_KEY)).toBeUndefined();
  });

  it('refreshes from the server once the change settles', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(ROOMS_KEY, ['Kitchen']);
    const handlers = optimisticUpdate<string[], string>(queryClient, ROOMS_KEY, (rooms) => rooms);
    await handlers.onSettled();
    expect(queryClient.getQueryState(ROOMS_KEY)?.isInvalidated).toBe(true);
  });
});
