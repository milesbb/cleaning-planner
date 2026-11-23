import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { rememberCurrentHome, rememberedHomeId } from '@/lib/home/current-home';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { HOME_PATH, homeAnswers } from '@/test/fake-home-answers';
import { HomeSettingsScreen } from './home-settings-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/settings/home',
}));

const CREATE_INVITE = `POST ${HOME_PATH}/invites`;
const LEAVE = `POST ${HOME_PATH}/leave`;
const NEW_INVITE: FakeAnswers = {
  [CREATE_INVITE]: () =>
    Promise.resolve({ code: '7K3M9QZA', expiresAt: '2026-12-01T09:00:00.000Z' }),
};

function openHomeSettings(extraAnswers: FakeAnswers = {}): FakeApiClient {
  const client = clientAnswering({ ...homeAnswers(), ...extraAnswers });
  renderWithApi(<HomeSettingsScreen />, client);
  return client;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  window.localStorage.clear();
  Reflect.deleteProperty(navigator, 'share');
});

describe('HomeSettingsScreen', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(
      <HomeSettingsScreen />,
      clientAnswering({ ...homeAnswers(), ...NEW_INVITE }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Get an invite code' }));
    await screen.findByText('7K3M 9QZA');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting the home while it loads', () => {
    openHomeSettings({ [`GET ${HOME_PATH}/members`]: () => new Promise(() => undefined) });
    expect(screen.getByRole('status')).toHaveTextContent('Getting your home');
  });

  it('shows the home and everyone who lives there', async () => {
    openHomeSettings();
    expect(await screen.findByRole('heading', { name: 'Our flat', level: 1 })).toBeInTheDocument();
    const people = within(screen.getByRole('list', { name: 'People' })).getAllByRole('listitem');
    expect(people).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Back to Settings' })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('makes an invite code and link that last a week', async () => {
    const client = openHomeSettings(NEW_INVITE);
    await userEvent.click(await screen.findByRole('button', { name: 'Get an invite code' }));
    const invite = screen.getByRole('region', { name: 'Invite someone' });
    expect(await within(invite).findByText('7K3M 9QZA')).toBeInTheDocument();
    expect(invite).toHaveTextContent('Works until 1 December');
    expect(within(invite).getByRole('textbox', { name: 'Invite link' })).toHaveValue(
      'http://localhost:3000/join?code=7K3M9QZA',
    );
    expect(client.calls).toContain(CREATE_INVITE);
  });

  it('copies the invite link', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    openHomeSettings(NEW_INVITE);
    await user.click(await screen.findByRole('button', { name: 'Get an invite code' }));
    await user.click(await screen.findByRole('button', { name: 'Copy link' }));
    expect(await navigator.clipboard.readText()).toBe('http://localhost:3000/join?code=7K3M9QZA');
    expect(screen.getByRole('status')).toHaveTextContent('Link copied');
  });

  it('shares the invite through the phone’s share sheet when there is one', async () => {
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    openHomeSettings(NEW_INVITE);
    await userEvent.click(await screen.findByRole('button', { name: 'Get an invite code' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith({
      title: 'Join Our flat',
      text: 'Join Our flat on Cleaning Planner. Your code is 7K3M9QZA.',
      url: 'http://localhost:3000/join?code=7K3M9QZA',
    });
  });

  it('only offers to copy where there is no share sheet', async () => {
    openHomeSettings(NEW_INVITE);
    await userEvent.click(await screen.findByRole('button', { name: 'Get an invite code' }));
    await screen.findByRole('button', { name: 'Copy link' });
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });

  it('explains when an invite cannot be made', async () => {
    openHomeSettings({
      [CREATE_INVITE]: () =>
        Promise.reject(new ApiRequestError('rejected', 'Too many invites. Try again in an hour.')),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Get an invite code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many invites');
  });

  it('lets someone leave the home after asking, then starts again from the top', async () => {
    rememberCurrentHome('home-1');
    const client = openHomeSettings({ [LEAVE]: () => Promise.resolve(undefined) });
    await userEvent.click(await screen.findByRole('button', { name: 'Leave this home' }));
    const sheet = await screen.findByRole('dialog', { name: 'Leave Our flat?' });
    expect(client.calls).not.toContain(LEAVE);
    await userEvent.click(within(sheet).getByRole('button', { name: 'Leave' }));
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });
    expect(rememberedHomeId()).toBeNull();
  });

  it('keeps the sheet open and explains when leaving fails', async () => {
    openHomeSettings({
      [LEAVE]: () =>
        Promise.reject(
          new ApiRequestError(
            'rejected',
            'You own this home. Make someone else the owner before you leave.',
          ),
        ),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Leave this home' }));
    const sheet = await screen.findByRole('dialog', { name: 'Leave Our flat?' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Leave' }));
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('You own this home');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('explains when the home cannot be loaded', async () => {
    openHomeSettings({
      [`GET ${HOME_PATH}`]: () =>
        Promise.reject(new ApiRequestError('rejected', 'You’re not in that home any more')),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('You’re not in that home any more');
  });
});
