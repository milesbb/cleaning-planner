import { createHouseholdRequestSchema } from '@cleaning-planner/contracts/household';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { stubAccountAuth } from '@/test/account-auth-stub';
import { hasJustCreatedHome } from '@/lib/setup/just-created-home';
import { ApiRequestError } from '@/lib/api/api-client';
import { useHomes } from '@/lib/home/home-queries';
import { DEFAULT_HOME_SETUP } from '@/lib/setup/home-setup';
import { forgetHomeSetup, useHomeSetup } from '@/lib/setup/home-setup-draft';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers } from '@/test/fake-api-client';
import SetupRemindersPage from './page';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const signedIn = stubAccountAuth({
  mightBeSignedIn: () => true,
  isSignedIn: () => Promise.resolve(true),
});

vi.mock('next/navigation', () => ({ useRouter: (): typeof router => router }));

const CREATE_ROUTE = 'POST /v1/households';
const CREATED = {
  id: 'home-1',
  name: 'Home',
  timeZone: 'Europe/London',
  weekStartsOn: 'monday',
  ownerId: 'user-sam',
  version: 1,
};

afterEach(() => {
  vi.clearAllMocks();
  forgetHomeSetup();
  window.localStorage.clear();
});

function SetupName(): string {
  return useHomeSetup().setup.homeName;
}

function HomeCount(): string {
  const homes = useHomes();
  return homes.data === undefined ? '' : `${String(homes.data.length)} homes`;
}

// Start or join a home loads the (empty) home list, then setup moves on, so
// no screen is showing that list when the home is created.
function HomeCountUntilHidden(): ReactNode {
  const [isShown, setIsShown] = useState(true);
  if (!isShown) return null;
  return (
    <>
      <HomeCount />
      <button
        type="button"
        onClick={() => {
          setIsShown(false);
        }}
      >
        Hide homes
      </button>
    </>
  );
}

function openReminders(answers: FakeAnswers = {}): ReturnType<typeof clientAnswering> {
  const client = clientAnswering(answers);
  renderWithApi(
    <>
      <SetupRemindersPage />
      <span data-testid="draft-name">
        <SetupName />
      </span>
    </>,
    client,
    signedIn,
  );
  return client;
}

async function createHome(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Create home' }));
}

describe('Setup: reminders', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(<SetupRemindersPage />, clientAnswering({}), signedIn);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows step 3 of 3 and goes back to appliances', () => {
    openReminders();
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/setup/appliances');
  });

  it('creates the home from every step’s choices, then explains how the app works', async () => {
    const client = openReminders({ [CREATE_ROUTE]: () => Promise.resolve(CREATED) });
    await userEvent.click(screen.getByRole('radio', { name: /Evening, 6pm/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'Sunday' }));
    await createHome();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/setup/done');
    });
    expect(client.calls).toEqual([CREATE_ROUTE]);
    const request = createHouseholdRequestSchema.parse(client.bodies[0]);
    expect(request).toMatchObject({
      name: DEFAULT_HOME_SETUP.homeName,
      weekStartsOn: 'sunday',
      features: DEFAULT_HOME_SETUP.features,
    });
    expect(request.rooms).toContainEqual({ type: 'kitchen', name: 'Kitchen' });
    expect(window.localStorage.getItem('cleaning-planner.reminder-time')).toBe('evening');
    expect(window.localStorage.getItem('cleaning-planner.current-home')).toBe('home-1');
    expect(hasJustCreatedHome()).toBe(true);
  });

  it('refreshes the list of homes, so Today finds the new one', async () => {
    const homesRoute = 'GET /v1/households';
    const client = clientAnswering({
      [homesRoute]: () => Promise.resolve([]),
      [CREATE_ROUTE]: () => Promise.resolve(CREATED),
    });
    renderWithApi(
      <>
        <SetupRemindersPage />
        <HomeCount />
      </>,
      client,
      signedIn,
    );
    expect(await screen.findByText('0 homes')).toBeInTheDocument();
    await createHome();
    await waitFor(() => {
      expect(client.calls.filter((call) => call === homesRoute)).toHaveLength(2);
    });
  });

  it('refreshes a home list saved earlier, even when no screen is showing it', async () => {
    const homesRoute = 'GET /v1/households';
    const client = clientAnswering({
      [homesRoute]: () => Promise.resolve([]),
      [CREATE_ROUTE]: () => Promise.resolve(CREATED),
    });
    renderWithApi(
      <>
        <SetupRemindersPage />
        <HomeCountUntilHidden />
      </>,
      client,
    );
    expect(await screen.findByText('0 homes')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hide homes' }));
    await createHome();
    await waitFor(() => {
      expect(client.calls.filter((call) => call === homesRoute)).toHaveLength(2);
    });
  });

  it('forgets the setup choices once the home exists', async () => {
    openReminders({ [CREATE_ROUTE]: () => Promise.resolve(CREATED) });
    await userEvent.click(screen.getByRole('radio', { name: 'Sunday' }));
    await createHome();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalled();
    });
    expect(window.sessionStorage.getItem('cleaning-planner.home-setup')).toBeNull();
  });

  it('says it is setting up the home while it waits', async () => {
    openReminders({ [CREATE_ROUTE]: () => new Promise(() => undefined) });
    await createHome();
    expect(screen.getByRole('button', { name: 'Setting up your home…' })).toBeDisabled();
  });

  it('never retries on its own, which could create the home twice', async () => {
    const client = openReminders({
      [CREATE_ROUTE]: () =>
        Promise.reject(new ApiRequestError('offline', 'Can’t reach Cleaning Planner.')),
    });
    await createHome();
    expect(await screen.findByRole('alert')).toHaveTextContent('Can’t reach Cleaning Planner.');
    expect(client.calls).toEqual([CREATE_ROUTE]);
  });

  it('explains a failure and keeps every choice so you can try again', async () => {
    openReminders({
      [CREATE_ROUTE]: () =>
        Promise.reject(
          new ApiRequestError('rejected', 'Pick a time zone from the list', { code: 'badRequest' }),
        ),
    });
    await userEvent.click(screen.getByRole('radio', { name: 'Sunday' }));
    await createHome();
    expect(await screen.findByRole('alert')).toHaveTextContent('Pick a time zone from the list');
    expect(screen.getByRole('button', { name: 'Create home' })).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'Sunday' })).toBeChecked();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
