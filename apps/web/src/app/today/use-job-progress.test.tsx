import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { onlineManager, useIsRestoring } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiProvider } from '@/lib/api/api-provider';
import type { SavedDataStorage } from '@/lib/storage/saved-data-storage';
import { clientAnswering } from '@/test/fake-api-client';
import type { FakeApiClient } from '@/test/fake-api-client';
import { useJobProgress } from './use-job-progress';
import type { JobProgress, ProgressContext } from './use-job-progress';

const HOME = '/v1/households/home-1';
const DONE_HOB = `POST ${HOME}/jobs/job-hob/completions`;
const UNDO_HOB = `DELETE ${HOME}/jobs/job-hob/completions/latest`;
const SAVED = {
  jobId: 'job-hob',
  nextDueDate: '2026-11-25',
  snooze: null,
  latestCompletion: null,
};
const SAVE_WAIT = { timeout: 3000 };
const TODAY = parseCalendarDate('2026-11-24');

const CONTEXT: ProgressContext = {
  householdId: 'home-1',
  range: { from: TODAY, to: parseCalendarDate('2026-11-25'), person: null },
  myUserId: 'user-alex',
  today: TODAY,
};

interface MemoryStorage extends SavedDataStorage {
  savedText: () => string;
}

function memoryStorage(): MemoryStorage {
  const saved = new Map<string, string>();
  return {
    savedText: (): string => [...saved.values()].join(''),
    getItem: (key): Promise<string | null> => Promise.resolve(saved.get(key) ?? null),
    setItem: (key, value): Promise<void> => {
      saved.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key): Promise<void> => {
      saved.delete(key);
      return Promise.resolve();
    },
  };
}

function savingClient(): FakeApiClient {
  return clientAnswering({
    [DONE_HOB]: () => Promise.resolve(SAVED),
    [UNDO_HOB]: () => Promise.resolve(SAVED),
  });
}

interface OpenApp {
  progress: JobProgress;
  isRestoring: boolean;
}

function openApp(
  client: FakeApiClient,
  storage: MemoryStorage,
): RenderHookResult<OpenApp, unknown> {
  return renderHook(() => ({ progress: useJobProgress(CONTEXT), isRestoring: useIsRestoring() }), {
    wrapper: ({ children }: { children: ReactNode }): ReactNode => (
      <ApiProvider client={client} onSignedOut={vi.fn()} savedData={storage}>
        {children}
      </ApiProvider>
    ),
  });
}

async function tapOfflineThenClose(taps: (progress: JobProgress) => void): Promise<MemoryStorage> {
  const storage = memoryStorage();
  act(() => {
    onlineManager.setOnline(false);
  });
  const { result, unmount } = openApp(savingClient(), storage);
  await waitFor(() => {
    expect(result.current.isRestoring).toBe(false);
  });
  act(() => {
    taps(result.current.progress);
  });
  await waitFor(() => {
    expect(storage.savedText()).toContain('job-hob');
  }, SAVE_WAIT);
  unmount();
  return storage;
}

afterEach(() => {
  act(() => {
    onlineManager.setOnline(true);
  });
});

describe('useJobProgress when the app closes while offline', () => {
  it('sends the tick once back online after the app reopens', async () => {
    const storage = await tapOfflineThenClose((progress) => {
      progress.markDone('job-hob');
    });
    const client = savingClient();
    openApp(client, storage);
    act(() => {
      onlineManager.setOnline(true);
    });
    await waitFor(() => {
      expect(client.calls).toEqual([DONE_HOB]);
    });
    expect(client.bodies[0]).toMatchObject({ outcome: 'done', completedOn: '2026-11-24' });
    expect(client.bodies[0]).toHaveProperty('idempotencyKey');
  });

  it('sends a tick and its undo in the order they were made', async () => {
    const storage = await tapOfflineThenClose((progress) => {
      progress.markDone('job-hob');
      progress.undo('job-hob');
    });
    const client = savingClient();
    openApp(client, storage);
    act(() => {
      onlineManager.setOnline(true);
    });
    await waitFor(() => {
      expect(client.calls).toEqual([DONE_HOB, UNDO_HOB]);
    });
  });
});
