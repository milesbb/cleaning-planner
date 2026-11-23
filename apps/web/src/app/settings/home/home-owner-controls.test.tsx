import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

const ALEX_OWNS_IT = {
  id: 'home-1',
  name: 'Our flat',
  timeZone: 'Europe/London',
  weekStartsOn: 'monday',
  ownerId: 'user-alex',
  version: 4,
};

// Alex's home "Our flat", which Alex owns and Sam lives in.
function ownerAnswers(extraAnswers: FakeAnswers = {}): FakeAnswers {
  return {
    ...homeAnswers(),
    'GET /v1/households': () =>
      Promise.resolve([{ id: 'home-1', name: 'Our flat', role: 'owner' }]),
    [`GET ${HOME_PATH}`]: () => Promise.resolve(ALEX_OWNS_IT),
    [`GET ${HOME_PATH}/members`]: () =>
      Promise.resolve([
        { userId: 'user-alex', name: 'Alex', colour: 'pink', role: 'owner' },
        { userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'member' },
      ]),
    ...extraAnswers,
  };
}

async function openAsOwner(extraAnswers: FakeAnswers = {}): Promise<FakeApiClient> {
  const client = clientAnswering(ownerAnswers(extraAnswers));
  renderWithApi(<HomeSettingsScreen />, client);
  await screen.findByRole('heading', { name: 'Our flat', level: 1 });
  return client;
}

async function openSheet(button: string, title: string): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('button', { name: button }));
  return screen.findByRole('dialog', { name: title });
}

async function waitForSheetToClose(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('a home’s owner', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(<HomeSettingsScreen />, clientAnswering(ownerAnswers()));
    await screen.findByRole('heading', { name: 'Our flat', level: 1 });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sees the home’s details and no way to leave without handing over', async () => {
    await openAsOwner();
    const details = screen.getByRole('region', { name: 'Home details' });
    expect(details).toHaveTextContent('Week starts on Monday');
    expect(details).toHaveTextContent('Europe/London');
    expect(screen.queryByRole('button', { name: 'Leave this home' })).not.toBeInTheDocument();
  });

  it('renames the home and changes when its week starts, sending only those', async () => {
    const client = await openAsOwner({
      [`PATCH ${HOME_PATH}`]: () => Promise.resolve({ ...ALEX_OWNS_IT, version: 5 }),
    });
    const sheet = await openSheet('Change home details', 'Home details');
    const name = within(sheet).getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'The flat');
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Sunday' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitForSheetToClose();
    expect(client.bodies[client.calls.indexOf(`PATCH ${HOME_PATH}`)]).toEqual({
      name: 'The flat',
      weekStartsOn: 'sunday',
      version: 4,
    });
  });

  it('changes the home’s time zone', async () => {
    const client = await openAsOwner({
      [`PATCH ${HOME_PATH}`]: () => Promise.resolve({ ...ALEX_OWNS_IT, version: 5 }),
    });
    const sheet = await openSheet('Change home details', 'Home details');
    await userEvent.selectOptions(
      within(sheet).getByRole('combobox', { name: 'Time zone' }),
      'Pacific/Auckland',
    );
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitForSheetToClose();
    expect(client.bodies[client.calls.indexOf(`PATCH ${HOME_PATH}`)]).toEqual({
      timeZone: 'Pacific/Auckland',
      version: 4,
    });
  });

  it('keeps the details sheet open and explains when someone else changed the home', async () => {
    await openAsOwner({
      [`PATCH ${HOME_PATH}`]: () =>
        Promise.reject(new ApiRequestError('rejected', 'Someone else changed this home')),
    });
    const sheet = await openSheet('Change home details', 'Home details');
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Saturday' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await within(sheet).findByRole('alert')).toHaveTextContent(
      'Someone else changed this home',
    );
  });

  it('hands the home over to someone else', async () => {
    const client = await openAsOwner({
      [`PATCH ${HOME_PATH}/members/user-sam`]: () =>
        Promise.resolve({ userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'owner' }),
    });
    const sheet = await openSheet('Manage Sam', 'Sam');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Make Sam the owner' }));
    await waitForSheetToClose();
    expect(client.bodies[client.calls.indexOf(`PATCH ${HOME_PATH}/members/user-sam`)]).toEqual({
      role: 'owner',
    });
  });

  it('removes someone from the home after asking', async () => {
    const client = await openAsOwner({
      [`DELETE ${HOME_PATH}/members/user-sam`]: () => Promise.resolve(undefined),
    });
    const sheet = await openSheet('Manage Sam', 'Sam');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove Sam' }));
    expect(client.calls).not.toContain(`DELETE ${HOME_PATH}/members/user-sam`);
    await userEvent.click(within(sheet).getByRole('button', { name: 'Yes, remove Sam' }));
    await waitForSheetToClose();
    expect(client.calls).toContain(`DELETE ${HOME_PATH}/members/user-sam`);
  });

  it('has nothing to manage about themselves', async () => {
    await openAsOwner();
    expect(screen.queryByRole('button', { name: 'Manage Alex' })).not.toBeInTheDocument();
  });

  it('deletes the home after asking, then starts again from the top', async () => {
    rememberCurrentHome('home-1');
    const client = await openAsOwner({ [`DELETE ${HOME_PATH}`]: () => Promise.resolve(undefined) });
    const sheet = await openSheet('Delete this home', 'Delete Our flat?');
    expect(client.calls).not.toContain(`DELETE ${HOME_PATH}`);
    await userEvent.click(within(sheet).getByRole('button', { name: 'Delete home' }));
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });
    expect(rememberedHomeId()).toBeNull();
  });
});

describe('someone who lives there but doesn’t own it', () => {
  it('can’t change the home or manage anyone', async () => {
    renderWithApi(<HomeSettingsScreen />, clientAnswering(homeAnswers()));
    await screen.findByRole('heading', { name: 'Our flat', level: 1 });
    expect(screen.getByRole('region', { name: 'Home details' })).toHaveTextContent(
      'Week starts on Monday',
    );
    expect(screen.queryByRole('button', { name: 'Change home details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Manage/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete this home' })).not.toBeInTheDocument();
  });
});
