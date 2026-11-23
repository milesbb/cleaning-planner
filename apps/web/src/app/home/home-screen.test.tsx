import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { HOME_PATH, homeAnswers } from '@/test/fake-home-answers';
import { fakeScreenOf, restoreScreen } from '@/test/fake-screen';
import { suggestedRoomName } from './add-room-sheet';
import { HomeScreen } from './home-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/home',
}));

const ADD_ROOM = `POST ${HOME_PATH}/rooms`;
const ADDED_ROOM = {
  id: 'room-bath',
  type: 'bathroom',
  name: 'Bathroom',
  order: 3,
  appliances: [],
  version: 1,
};

function openHome(answers: FakeAnswers = homeAnswers()): FakeApiClient {
  const client = clientAnswering(answers);
  renderWithApi(<HomeScreen />, client);
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
  restoreScreen();
});

describe('HomeScreen', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(<HomeScreen />, clientAnswering(homeAnswers()));
    await screen.findByRole('heading', { name: 'Home', level: 1 });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting the rooms while it loads', () => {
    openHome({
      ...homeAnswers(),
      [`GET ${HOME_PATH}/progress`]: () => new Promise(() => undefined),
    });
    expect(screen.getByRole('status')).toHaveTextContent('Getting your rooms');
  });

  it('shows a tile for every room with its job and late counts', async () => {
    openHome();
    expect(await screen.findByText('3 rooms · 5 jobs')).toBeInTheDocument();
    const kitchen = screen.getByRole('link', { name: /Kitchen/ });
    expect(kitchen).toHaveAttribute('href', '/room?id=room-kitchen');
    expect(within(kitchen).getByText('3 jobs')).toBeInTheDocument();
    expect(within(kitchen).getByText('1 late')).toBeInTheDocument();
    expect(kitchen).toHaveAccessibleName(/2 of 3 up to date/);
    expect(within(screen.getByRole('link', { name: /Bedroom/ })).queryByText(/late/)).toBeNull();
  });

  it('adds a room and refreshes the home', async () => {
    const client = openHome({ ...homeAnswers(), [ADD_ROOM]: () => Promise.resolve(ADDED_ROOM) });
    await userEvent.click(await screen.findByRole('button', { name: 'Add a room' }));
    const sheet = await screen.findByRole('dialog', { name: 'Add a room' });
    expect(within(sheet).getByLabelText('Name')).toHaveValue('Bathroom');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Add room' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(client.bodies[client.calls.indexOf(ADD_ROOM)]).toEqual({
      type: 'bathroom',
      name: 'Bathroom',
    });
    expect(client.calls.filter((call) => call === `GET ${HOME_PATH}/rooms`)).toHaveLength(2);
  });

  it('suggests a name for the room type picked', async () => {
    openHome();
    await userEvent.click(await screen.findByRole('button', { name: 'Add a room' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Kitchen' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Kitchen 2');
  });

  it('needs a name, and explains a failed add without closing', async () => {
    openHome({
      ...homeAnswers(),
      [ADD_ROOM]: () =>
        Promise.reject(new ApiRequestError('rejected', 'A home can have up to 30 rooms')),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Add a room' }));
    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.click(screen.getByRole('button', { name: 'Add room' }));
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription(/Enter a name/);
    await userEvent.type(screen.getByLabelText('Name'), 'Ensuite');
    await userEvent.click(screen.getByRole('button', { name: 'Add room' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A home can have up to 30 rooms');
    expect(screen.getByRole('dialog', { name: 'Add a room' })).toBeInTheDocument();
  });

  it('sends someone without a home to start one', async () => {
    openHome({ ...homeAnswers(), 'GET /v1/households': () => Promise.resolve([]) });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/homes/new');
    });
  });

  it('explains when the rooms cannot be loaded', async () => {
    openHome({
      ...homeAnswers(),
      [`GET ${HOME_PATH}/rooms`]: () =>
        Promise.reject(new ApiRequestError('rejected', 'You’re not in that home any more')),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('You’re not in that home any more');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('puts Recently in a column beside the rooms on a laptop, also while reordering', async () => {
    fakeScreenOf(true);
    openHome();
    const activity = await screen.findByRole('region', { name: 'Activity' });
    expect(within(activity).getByRole('heading', { name: 'Recently' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reorder rooms' }));
    expect(screen.getByRole('region', { name: 'Activity' })).toBeInTheDocument();
  });

  it('keeps Recently under the rooms on phones', async () => {
    openHome();
    const activity = await screen.findByRole('region', { name: 'Activity' });
    expect(within(activity).getByRole('heading', { name: 'Recently' })).toBeInTheDocument();
  });
});

describe('suggestedRoomName', () => {
  it('numbers a second room of the same kind', () => {
    expect(suggestedRoomName('bathroom', ['Kitchen'])).toBe('Bathroom');
    expect(suggestedRoomName('bathroom', ['Bathroom'])).toBe('Bathroom 2');
    expect(suggestedRoomName('bathroom', ['Bathroom', 'Bathroom 2'])).toBe('Bathroom 3');
  });
});
