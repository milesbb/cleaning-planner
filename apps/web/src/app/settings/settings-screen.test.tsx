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
import { SettingsScreen } from './settings-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/settings',
}));

const UPDATE_ME = 'PATCH /v1/me';
const SIGNED_IN = (): AccountAuth => stubAccountAuth({ isSignedIn: () => Promise.resolve(true) });

function openSettings(
  answers: FakeAnswers = homeAnswers(),
  auth: AccountAuth = SIGNED_IN(),
): FakeApiClient {
  const client = clientAnswering(answers);
  renderWithApi(<SettingsScreen />, client, auth);
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

describe('SettingsScreen', () => {
  it('has no accessibility violations', async () => {
    const client = clientAnswering(homeAnswers());
    const { container } = renderWithApi(<SettingsScreen />, client);
    await screen.findByText('alex@example.com');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting settings while it loads', () => {
    openSettings({ ...homeAnswers(), 'GET /v1/me': () => new Promise(() => undefined) });
    expect(screen.getByRole('status')).toHaveTextContent('Getting your settings');
  });

  it('shows who you are and who lives in this home', async () => {
    openSettings();
    const you = await screen.findByRole('region', { name: 'You' });
    expect(you).toHaveTextContent('Alex');
    expect(you).toHaveTextContent('alex@example.com');
    const home = screen.getByRole('region', { name: 'Our flat' });
    const people = within(home).getAllByRole('listitem');
    expect(people.map((person) => person.textContent)).toEqual([
      expect.stringContaining('Alex (you)'),
      expect.stringContaining('Sam'),
    ]);
    expect(within(people[1] ?? home).getByText('Owner')).toBeInTheDocument();
    expect(within(home).getByRole('link', { name: 'Home settings' })).toHaveAttribute(
      'href',
      '/settings/home',
    );
  });

  it('changes your name and colour', async () => {
    const client = openSettings({
      ...homeAnswers(),
      [UPDATE_ME]: () =>
        Promise.resolve({
          id: 'user-alex',
          name: 'Lex',
          email: 'alex@example.com',
          colour: 'teal',
        }),
    });
    const sheet = await openProfileSheet();
    const name = within(sheet).getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Lex');
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Teal' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(client.bodies[client.calls.indexOf(UPDATE_ME)]).toEqual({ name: 'Lex', colour: 'teal' });
  });

  it('sends only what changed, and nothing when nothing did', async () => {
    const client = openSettings();
    const sheet = await openProfileSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(client.calls).not.toContain(UPDATE_ME);
  });

  it('needs a name', async () => {
    const client = openSettings();
    const sheet = await openProfileSheet();
    await userEvent.clear(within(sheet).getByRole('textbox', { name: 'Name' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      /Enter a name/,
    );
    expect(client.calls).not.toContain(UPDATE_ME);
  });

  it('keeps the sheet open and explains when saving fails', async () => {
    openSettings({
      ...homeAnswers(),
      [UPDATE_ME]: () => Promise.reject(new ApiRequestError('rejected', 'Pick one of the colours')),
    });
    const sheet = await openProfileSheet();
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Green' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Pick one of the colours');
  });

  it('signs out, forgets this device’s home and goes to the welcome screen', async () => {
    rememberCurrentHome('home-1');
    const auth = SIGNED_IN();
    openSettings(homeAnswers(), auth);
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/welcome');
    });
    expect(auth.signOut).toHaveBeenCalled();
    expect(rememberedHomeId()).toBeNull();
  });

  it('explains when signing out fails', async () => {
    const auth = stubAccountAuth({
      isSignedIn: () => Promise.resolve(true),
      signOut: vi.fn(() => Promise.reject(new Error('Network error'))),
    });
    openSettings(homeAnswers(), auth);
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t sign out. Try again.');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('explains when settings cannot be loaded', async () => {
    openSettings({
      ...homeAnswers(),
      'GET /v1/me': () =>
        Promise.reject(new ApiRequestError('rejected', 'You’re signed in as someone else')),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('You’re signed in as someone else');
  });
});
