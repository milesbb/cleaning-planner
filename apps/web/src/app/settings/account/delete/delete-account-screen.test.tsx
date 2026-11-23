import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import type { AccountAuth } from '@/lib/auth/account-auth';
import { AccountAuthError } from '@/lib/auth/account-auth-error';
import { rememberCurrentHome, rememberedHomeId } from '@/lib/home/current-home';
import { stubAccountAuth } from '@/test/account-auth-stub';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { homeAnswers } from '@/test/fake-home-answers';
import { DeleteAccountScreen } from './delete-account-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/settings/account/delete',
}));

const DELETE_ME = 'DELETE /v1/me';
const PASSWORD = 'lemon kettle sunday';

function threeHomes(): FakeAnswers {
  return {
    ...homeAnswers(),
    'GET /v1/households': () =>
      Promise.resolve([
        { id: 'home-1', name: 'Our flat', role: 'member' },
        { id: 'home-2', name: 'Beach house', role: 'owner' },
        { id: 'home-3', name: 'Cabin', role: 'owner' },
      ]),
    'GET /v1/households/home-2/members': () =>
      Promise.resolve([
        { userId: 'user-alex', name: 'Alex', colour: 'pink', role: 'owner' },
        { userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'member' },
      ]),
    'GET /v1/households/home-3/members': () =>
      Promise.resolve([{ userId: 'user-alex', name: 'Alex', colour: 'pink', role: 'owner' }]),
    [DELETE_ME]: () => Promise.resolve(undefined),
  };
}

function signedIn(overrides: Partial<AccountAuth> = {}): AccountAuth {
  return stubAccountAuth({ isSignedIn: () => Promise.resolve(true), ...overrides });
}

function openDeleteAccount(
  auth: AccountAuth = signedIn(),
  answers: FakeAnswers = threeHomes(),
): FakeApiClient {
  const client = clientAnswering(answers);
  renderWithApi(<DeleteAccountScreen />, client, auth);
  return client;
}

async function chooseForBeachHouse(choice: string): Promise<void> {
  const group = await screen.findByRole('radiogroup', { name: 'Who looks after Beach house?' });
  await userEvent.click(within(group).getByRole('radio', { name: choice }));
}

async function deleteWithPassword(password = PASSWORD): Promise<void> {
  await userEvent.type(screen.getByLabelText('Your password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
}

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('DeleteAccountScreen', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(<DeleteAccountScreen />, clientAnswering(threeHomes()));
    await screen.findByRole('radiogroup', { name: 'Who looks after Beach house?' });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting your account while it loads', () => {
    openDeleteAccount(signedIn(), {
      ...threeHomes(),
      'GET /v1/households': () => new Promise(() => {}),
    });
    expect(screen.getByRole('status')).toHaveTextContent('Getting your account');
  });

  it('explains when your homes cannot be loaded', async () => {
    openDeleteAccount(signedIn(), {
      ...threeHomes(),
      'GET /v1/households': () => Promise.reject(new ApiRequestError('rejected', 'Homes are busy')),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Homes are busy');
  });

  it('explains what happens to each of your homes', async () => {
    openDeleteAccount();
    const homes = await screen.findByRole('region', { name: 'Your homes' });
    expect(homes).toHaveTextContent('You’ll leave Our flat.');
    expect(homes).toHaveTextContent('Cabin will be deleted, because nobody else lives there.');
    expect(
      within(homes).getByRole('radiogroup', { name: 'Who looks after Beach house?' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/This can’t be undone/)).toBeInTheDocument();
  });

  it('says there is nothing to decide when you have no homes', async () => {
    openDeleteAccount(signedIn(), {
      ...threeHomes(),
      'GET /v1/households': () => Promise.resolve([]),
    });
    expect(await screen.findByText('You’re not part of any homes.')).toBeInTheDocument();
  });

  it('checks your password, deletes the account, signs out and goes to Welcome', async () => {
    rememberCurrentHome('home-1');
    const auth = signedIn();
    const client = openDeleteAccount(auth);
    await chooseForBeachHouse('Sam');
    await deleteWithPassword();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/welcome');
    });
    expect(auth.recheckPassword).toHaveBeenCalledWith('alex@example.com', PASSWORD);
    expect(client.bodies[client.calls.indexOf(DELETE_ME)]).toEqual({
      ownedHomes: [{ householdId: 'home-2', action: 'handOver', newOwnerId: 'user-sam' }],
    });
    expect(auth.signOut).toHaveBeenCalled();
    expect(rememberedHomeId()).toBeNull();
  });

  it('can delete a shared home instead of handing it over', async () => {
    const client = openDeleteAccount();
    await chooseForBeachHouse('Delete Beach house');
    await deleteWithPassword();
    await waitFor(() => {
      expect(client.calls).toContain(DELETE_ME);
    });
    expect(client.bodies[client.calls.indexOf(DELETE_ME)]).toEqual({
      ownedHomes: [{ householdId: 'home-2', action: 'delete' }],
    });
  });

  it('still finishes when signing out of the deleted account fails', async () => {
    openDeleteAccount(signedIn({ signOut: vi.fn(() => Promise.reject(new Error('Gone'))) }));
    await chooseForBeachHouse('Sam');
    await deleteWithPassword();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/welcome');
    });
  });

  it('asks who looks after a shared home before checking anything', async () => {
    const auth = signedIn();
    openDeleteAccount(auth);
    await screen.findByRole('radiogroup', { name: 'Who looks after Beach house?' });
    await deleteWithPassword();
    expect(
      screen.getByText('Choose who looks after Beach house, or delete it'),
    ).toBeInTheDocument();
    expect(auth.recheckPassword).not.toHaveBeenCalled();
  });

  it('needs your password', async () => {
    const auth = signedIn();
    openDeleteAccount(auth);
    await chooseForBeachHouse('Sam');
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    expect(screen.getByLabelText('Your password')).toHaveAccessibleDescription(
      /Enter your password/,
    );
    expect(auth.recheckPassword).not.toHaveBeenCalled();
  });

  it('stays on the page when the password is wrong, and lets you try again', async () => {
    const recheckPassword = vi
      .fn<AccountAuth['recheckPassword']>()
      .mockRejectedValueOnce(new AccountAuthError('wrongCurrentPassword'))
      .mockResolvedValue();
    const client = openDeleteAccount(signedIn({ recheckPassword }));
    await chooseForBeachHouse('Sam');
    await deleteWithPassword('lemon kettle');
    await waitFor(() => {
      expect(screen.getByLabelText('Your password')).toHaveAccessibleDescription(
        /That isn’t your current password/,
      );
    });
    expect(client.calls).not.toContain(DELETE_ME);
    await userEvent.clear(screen.getByLabelText('Your password'));
    await deleteWithPassword();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/welcome');
    });
  });

  it('explains when the account cannot be deleted', async () => {
    openDeleteAccount(signedIn(), {
      ...threeHomes(),
      [DELETE_ME]: () =>
        Promise.reject(new ApiRequestError('rejected', 'Choose who looks after Beach house')),
    });
    await chooseForBeachHouse('Sam');
    await deleteWithPassword();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose who looks after Beach house',
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeEnabled();
  });
});
