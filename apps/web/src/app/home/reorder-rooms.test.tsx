import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { HOME_PATH, homeAnswers } from '@/test/fake-home-answers';
import { bodyOf } from '@/test/open-job';
import { TODAY_FIXTURE } from '../today/today-fixture';
import { HomeScreen } from './home-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/home',
}));

const KITCHEN_PATH = `${HOME_PATH}/rooms/room-kitchen`;
const LIVING_PATH = `${HOME_PATH}/rooms/room-living`;
const [KITCHEN] = TODAY_FIXTURE.rooms;

// Moving the kitchen down: the server keeps each saved place.
function savedRooms(): FakeAnswers {
  const rooms = TODAY_FIXTURE.rooms.map((room) => ({ ...room }));
  const save = (roomId: string, order: number): Promise<unknown> => {
    const room = rooms.find((candidate) => candidate.id === roomId);
    Object.assign(room ?? {}, { order, version: 2 });
    return Promise.resolve(room);
  };
  return {
    [`GET ${HOME_PATH}/rooms`]: () => Promise.resolve(rooms),
    [`PATCH ${KITCHEN_PATH}`]: () => save('room-kitchen', 1),
    [`PATCH ${LIVING_PATH}`]: () => save('room-living', 0),
  };
}

const NEVER_ANSWERED = (): Promise<unknown> => new Promise(() => undefined);

async function reorderHome(answers: FakeAnswers = savedRooms()): Promise<FakeApiClient> {
  const client = clientAnswering({ ...homeAnswers(), ...answers });
  renderWithApi(<HomeScreen />, client);
  await userEvent.click(await screen.findByRole('button', { name: 'Reorder rooms' }));
  return client;
}

function roomOrder(): string[] {
  const list = screen.getByRole('list', { name: 'Room order' });
  return within(list)
    .getAllByRole('listitem')
    .map((item) => within(item).getByText(/./, { selector: 'span' }).textContent);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('reordering rooms', () => {
  it('has no accessibility violations', async () => {
    await reorderHome();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('lists the rooms in their order, with Move up and Move down for each', async () => {
    await reorderHome();
    expect(roomOrder()).toEqual(['Kitchen', 'Living room', 'Bedroom']);
    expect(screen.getByRole('button', { name: 'Move Kitchen up' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Move Bedroom down' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.queryByRole('button', { name: 'Add a room' })).not.toBeInTheDocument();
  });

  it('moves a room at once and saves the rooms whose place changed, with their versions', async () => {
    const client = await reorderHome({
      [`PATCH ${KITCHEN_PATH}`]: NEVER_ANSWERED,
      [`PATCH ${LIVING_PATH}`]: NEVER_ANSWERED,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Move Kitchen down' }));
    expect(roomOrder()).toEqual(['Living room', 'Kitchen', 'Bedroom']);
    expect(screen.getByRole('status')).toHaveTextContent('Kitchen is now 2 of 3');
    expect(bodyOf(client, `PATCH ${KITCHEN_PATH}`)).toEqual({ order: 1, version: 1 });
    expect(bodyOf(client, `PATCH ${LIVING_PATH}`)).toEqual({ order: 0, version: 1 });
    expect(client.calls).not.toContain(`PATCH ${HOME_PATH}/rooms/room-bed`);
  });

  it('waits for a save before taking the next move', async () => {
    const client = await reorderHome({
      [`PATCH ${KITCHEN_PATH}`]: NEVER_ANSWERED,
      [`PATCH ${LIVING_PATH}`]: NEVER_ANSWERED,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Move Kitchen down' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move Kitchen down' }));
    expect(roomOrder()).toEqual(['Living room', 'Kitchen', 'Bedroom']);
    expect(client.calls.filter((call) => call.startsWith('PATCH'))).toHaveLength(2);
  });

  it('keeps the new order once it is saved', async () => {
    await reorderHome();
    await userEvent.click(screen.getByRole('button', { name: 'Move Kitchen down' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Move Kitchen up' })).toHaveAttribute(
        'aria-disabled',
        'false',
      );
    });
    expect(roomOrder()).toEqual(['Living room', 'Kitchen', 'Bedroom']);
  });

  it('ignores the first room moving up', async () => {
    const client = await reorderHome();
    await userEvent.click(screen.getByRole('button', { name: 'Move Kitchen up' }));
    expect(roomOrder()).toEqual(['Kitchen', 'Living room', 'Bedroom']);
    expect(client.calls.some((call) => call.startsWith('PATCH'))).toBe(false);
  });

  it('puts the list back and says so when the order cannot be saved', async () => {
    await reorderHome({
      ...savedRooms(),
      [`PATCH ${KITCHEN_PATH}`]: () =>
        Promise.reject(new ApiRequestError('offline', 'Can’t reach Cleaning Planner.')),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Move Kitchen down' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The new order wasn’t saved. Can’t reach Cleaning Planner.',
    );
    expect(roomOrder()).toEqual(['Kitchen', 'Living room', 'Bedroom']);
  });

  it('goes back to the room tiles when done', async () => {
    await reorderHome();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('list', { name: 'Rooms' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add a room' })).toBeInTheDocument();
  });

  it('offers no reordering with only one room', async () => {
    renderWithApi(
      <HomeScreen />,
      clientAnswering({
        ...homeAnswers(),
        [`GET ${HOME_PATH}/rooms`]: () => Promise.resolve([KITCHEN]),
      }),
    );
    await screen.findByRole('list', { name: 'Rooms' });
    expect(screen.queryByRole('button', { name: 'Reorder rooms' })).not.toBeInTheDocument();
  });
});
