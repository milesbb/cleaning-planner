import { profileSchema } from '@cleaning-planner/contracts/profile';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from './api-client';
import type { ApiClient } from './api-client';
import { ApiProvider, useApiQuery } from './api-provider';
import { memoryStorage } from '@/test/memory-storage';
import type { MemoryStorage } from '@/test/memory-storage';

const SAM = { id: 'user-sam', name: 'Sam', email: 'sam@example.com', colour: 'blue' as const };
const SAVE_WAIT = { timeout: 3000 };

function clientAnswering(answer: (path: string) => Promise<unknown>): ApiClient {
  return {
    request: <Result,>(request: {
      path: string;
      response: { parse: (value: unknown) => Result };
    }) => answer(request.path).then((value) => request.response.parse(value)),
  };
}

const neverAnswers = clientAnswering(() => new Promise(() => undefined));

function MyName(): ReactNode {
  const profile = useApiQuery(['me'], { method: 'GET', path: '/v1/me', response: profileSchema });
  return <p>{profile.data === undefined ? 'Loading' : `Signed in as ${profile.data.name}`}</p>;
}

function MyHomes(): ReactNode {
  const homes = useApiQuery(['homes'], {
    method: 'GET',
    path: '/v1/households',
    response: profileSchema,
  });
  return <p>{homes.isError ? 'Signed out' : 'Homes'}</p>;
}

function renderSaving(
  client: ApiClient,
  storage: MemoryStorage,
  ui: ReactNode = <MyName />,
): ReturnType<typeof render> {
  return render(
    <ApiProvider client={client} onSignedOut={vi.fn()} savedData={storage}>
      {ui}
    </ApiProvider>,
  );
}

async function saveSamsProfile(storage: MemoryStorage): Promise<void> {
  const { unmount } = renderSaving(
    clientAnswering(() => Promise.resolve(SAM)),
    storage,
  );
  await screen.findByText('Signed in as Sam');
  await waitFor(() => {
    expect(storage.savedText()).toContain('user-sam');
  }, SAVE_WAIT);
  unmount();
}

describe('ApiProvider with saved data', () => {
  it('has no accessibility violations', async () => {
    const storage = memoryStorage();
    await saveSamsProfile(storage);
    const { container } = renderSaving(neverAnswers, storage);
    await screen.findByText('Signed in as Sam');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('opens with the last answers saved on this device, before the API answers', async () => {
    const storage = memoryStorage();
    await saveSamsProfile(storage);
    renderSaving(neverAnswers, storage);
    expect(await screen.findByText('Signed in as Sam')).toBeInTheDocument();
  });

  it('refreshes the saved answers from the API straight away', async () => {
    const storage = memoryStorage();
    await saveSamsProfile(storage);
    renderSaving(
      clientAnswering(() => Promise.resolve({ ...SAM, name: 'Samantha' })),
      storage,
    );
    expect(await screen.findByText('Signed in as Samantha')).toBeInTheDocument();
  });

  it('forgets everything saved, and saves nothing more, once the API says the person is signed out', async () => {
    const storage = memoryStorage();
    await saveSamsProfile(storage);
    const signedOutForHomes = clientAnswering((path) =>
      path === '/v1/households'
        ? Promise.reject(new ApiRequestError('signedOut', 'Sign in to continue'))
        : Promise.resolve(SAM),
    );
    renderSaving(
      signedOutForHomes,
      storage,
      <>
        <MyHomes />
        <MyName />
      </>,
    );
    await screen.findByText('Signed out');
    await screen.findByText('Signed in as Sam');
    await waitFor(() => {
      expect(storage.savedText()).not.toContain('user-sam');
    }, SAVE_WAIT);
  });

  it('works as before without saved data', async () => {
    render(
      <ApiProvider client={clientAnswering(() => Promise.resolve(SAM))} onSignedOut={vi.fn()}>
        <MyName />
      </ApiProvider>,
    );
    expect(await screen.findByText('Signed in as Sam')).toBeInTheDocument();
  });
});
