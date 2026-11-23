import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import type { AccountAuth } from '@/lib/auth/account-auth';
import { rememberCurrentHome, rememberedHomeId } from '@/lib/home/current-home';
import { stubAccountAuth } from '@/test/account-auth-stub';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { homeAnswers } from '@/test/fake-home-answers';
import { YourAccountScreen } from './your-account-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/settings/account',
}));

const UPDATE_ME = 'PATCH /v1/me';
const SIGNED_IN = (): AccountAuth => stubAccountAuth({ isSignedIn: () => Promise.resolve(true) });

function twoHomes(): FakeAnswers {
  return {
    ...homeAnswers(),
    'GET /v1/households': () =>
      Promise.resolve([
        { id: 'home-1', name: 'Our flat', role: 'member' },
        { id: 'home-2', name: 'Beach house', role: 'owner' },
      ]),
  };
}

function openYourAccount(
  answers: FakeAnswers = twoHomes(),
  auth: AccountAuth = SIGNED_IN(),
): FakeApiClient {
  const client = clientAnswering(answers);
  renderWithApi(<YourAccountScreen />, client, auth);
  return client;
}

async function openProfileSheet(): Promise<HTMLElement> {
  await userEvent.click(await screen.findByRole('button', { name: 'Change name and colour' }));
  return screen.findByRole('dialog', { name: 'Your name and colour' });
}

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('YourAccountScreen', () => {
  it('has no accessibility violations', async () => {
    const client = clientAnswering(twoHomes());
    const { container } = renderWithApi(<YourAccountScreen />, client);
    await screen.findByText('Beach house');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting your account while it loads', () => {
    openYourAccount({ ...twoHomes(), 'GET /v1/me': () => new Promise(() => undefined) });
    expect(screen.getByRole('status')).toHaveTextContent('Getting your account');
  });

  it('explains when your account cannot be loaded, and tries again', async () => {
    const answers = twoHomes();
    const loadMe = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(new ApiRequestError('rejected', 'Your account is busy'))
      .mockImplementation(answers['GET /v1/me'] ?? vi.fn());
    openYourAccount({ ...answers, 'GET /v1/me': loadMe });
    expect(await screen.findByRole('alert')).toHaveTextContent('Your account is busy');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('alex@example.com')).toBeInTheDocument();
  });

  it('shows your details with ways to change them', async () => {
    openYourAccount();
    const details = await screen.findByRole('region', { name: 'Your details' });
    expect(details).toHaveTextContent('Alex');
    expect(details).toHaveTextContent('alex@example.com');
    expect(within(details).getByRole('link', { name: 'Change email' })).toHaveAttribute(
      'href',
      '/settings/account/email',
    );
    expect(within(details).getByRole('link', { name: 'Change password' })).toHaveAttribute(
      'href',
      '/settings/account/password',
    );
  });

  it('changes your name and colour, sending only what changed', async () => {
    const client = openYourAccount({
      ...twoHomes(),
      [UPDATE_ME]: () =>
        Promise.resolve({
          id: 'user-alex',
          name: 'Alex',
          email: 'alex@example.com',
          colour: 'teal',
        }),
    });
    const sheet = await openProfileSheet();
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Teal' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(client.bodies[client.calls.indexOf(UPDATE_ME)]).toEqual({ colour: 'teal' });
  });

  it('sends only what changed, and nothing when nothing did', async () => {
    const client = openYourAccount();
    const sheet = await openProfileSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(client.calls).not.toContain(UPDATE_ME);
  });

  it('needs a name', async () => {
    const client = openYourAccount();
    const sheet = await openProfileSheet();
    await userEvent.clear(within(sheet).getByRole('textbox', { name: 'Name' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      /Enter a name/,
    );
    expect(client.calls).not.toContain(UPDATE_ME);
  });

  it('keeps the sheet open and explains when saving fails', async () => {
    openYourAccount({
      ...twoHomes(),
      [UPDATE_ME]: () => Promise.reject(new ApiRequestError('rejected', 'Pick one of the colours')),
    });
    const sheet = await openProfileSheet();
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Green' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Pick one of the colours');
  });

  it('lists your homes, marking the ones you own and the one this device shows', async () => {
    rememberCurrentHome('home-1');
    openYourAccount();
    const homes = await screen.findByRole('region', { name: 'Your homes' });
    const choices = within(homes).getAllByRole('button');
    expect(choices.map((choice) => choice.textContent)).toEqual([
      expect.stringContaining('Our flat'),
      expect.stringContaining('Beach house'),
    ]);
    expect(choices[0]).toHaveAttribute('aria-current', 'true');
    expect(choices[1]).toHaveTextContent('Owner');
    expect(within(homes).getByRole('link', { name: 'Start or join a home' })).toHaveAttribute(
      'href',
      '/homes/new',
    );
  });

  it('opens a home’s settings, making it the home this device shows', async () => {
    rememberCurrentHome('home-1');
    openYourAccount();
    await userEvent.click(await screen.findByRole('button', { name: /Beach house/ }));
    expect(rememberedHomeId()).toBe('home-2');
    expect(router.push).toHaveBeenCalledWith('/settings/home');
  });

  it('offers to start or join a home when you have none', async () => {
    openYourAccount({ ...twoHomes(), 'GET /v1/households': () => Promise.resolve([]) });
    const homes = await screen.findByRole('region', { name: 'Your homes' });
    expect(homes).toHaveTextContent('You’re not part of a home yet.');
    expect(within(homes).queryByRole('button')).not.toBeInTheDocument();
    expect(within(homes).getByRole('link', { name: 'Start or join a home' })).toBeInTheDocument();
  });

  it('signs out', async () => {
    const auth = SIGNED_IN();
    openYourAccount(twoHomes(), auth);
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/welcome');
    });
    expect(auth.signOut).toHaveBeenCalled();
  });
});
