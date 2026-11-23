import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { onlineManager, useIsRestoring } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiProvider } from '@/lib/api/api-provider';
import { clientAnswering } from '@/test/fake-api-client';
import type { FakeApiClient } from '@/test/fake-api-client';
import { memoryStorage } from '@/test/memory-storage';
import type { MemoryStorage } from '@/test/memory-storage';
import { useProgressChange } from './use-job-actions';
import type { ProgressActions, ProgressChange } from './use-job-actions';

const JOB = '/v1/households/home-1/jobs/job-oven';
const SNOOZE = `POST ${JOB}/snooze`;
const COMPLETE = `POST ${JOB}/completions`;
const SAVED = {
  jobId: 'job-oven',
  nextDueDate: '2026-12-01',
  snooze: null,
  latestCompletion: null,
};
const TODAY = parseCalendarDate('2026-11-24');
const SAVE_WAIT = { timeout: 3000 };

function savingClient(): FakeApiClient {
  return clientAnswering({
    [SNOOZE]: () => Promise.resolve(SAVED),
    [COMPLETE]: () => Promise.resolve(SAVED),
  });
}

interface OpenJob {
  progress: ProgressActions;
  isRestoring: boolean;
}

function openJob(
  client: FakeApiClient,
  storage: MemoryStorage,
): RenderHookResult<OpenJob, unknown> {
  return renderHook(
    () => ({
      progress: useProgressChange({ householdId: 'home-1', jobId: 'job-oven' }),
      isRestoring: useIsRestoring(),
    }),
    {
      wrapper: ({ children }: { children: ReactNode }): ReactNode => (
        <ApiProvider client={client} onSignedOut={vi.fn()} savedData={storage}>
          {children}
        </ApiProvider>
      ),
    },
  );
}

async function recordOfflineThenClose(change: ProgressChange): Promise<MemoryStorage> {
  const storage = memoryStorage();
  act(() => {
    onlineManager.setOnline(false);
  });
  const { result, unmount } = openJob(savingClient(), storage);
  await waitFor(() => {
    expect(result.current.isRestoring).toBe(false);
  });
  act(() => {
    result.current.progress.record(change);
  });
  await waitFor(() => {
    expect(storage.savedText()).toContain('job-oven');
  }, SAVE_WAIT);
  unmount();
  return storage;
}

async function reopenOnline(storage: MemoryStorage): Promise<FakeApiClient> {
  const client = savingClient();
  openJob(client, storage);
  act(() => {
    onlineManager.setOnline(true);
  });
  await waitFor(() => {
    expect(client.calls).toHaveLength(1);
  });
  return client;
}

afterEach(() => {
  act(() => {
    onlineManager.setOnline(true);
  });
});

describe('useProgressChange when the app closes while offline', () => {
  it('sends a snooze once back online after the app reopens', async () => {
    const until = parseCalendarDate('2026-11-27');
    const client = await reopenOnline(await recordOfflineThenClose({ kind: 'snooze', until }));
    expect(client.calls).toEqual([SNOOZE]);
    expect(client.bodies[0]).toMatchObject({ until: '2026-11-27' });
    expect(client.bodies[0]).toHaveProperty('idempotencyKey');
  });

  it('sends a skip once back online after the app reopens', async () => {
    const client = await reopenOnline(
      await recordOfflineThenClose({ kind: 'skipped', today: TODAY }),
    );
    expect(client.calls).toEqual([COMPLETE]);
    expect(client.bodies[0]).toMatchObject({ outcome: 'skipped', completedOn: '2026-11-24' });
  });

  it('sends a job done on an earlier day with that day', async () => {
    const on = parseCalendarDate('2026-11-22');
    const client = await reopenOnline(await recordOfflineThenClose({ kind: 'doneEarlier', on }));
    expect(client.bodies[0]).toMatchObject({ outcome: 'done', completedOn: '2026-11-22' });
  });
});
