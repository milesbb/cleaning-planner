import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { HOME_PATH, homeAnswers } from '@/test/fake-home-answers';
import { bodyOf } from '@/test/open-job';
import { TODAY_FIXTURE } from '../today/today-fixture';
import { RoomScreen } from './room-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/room',
}));

const KITCHEN_PATH = `${HOME_PATH}/rooms/room-kitchen`;
const KITCHEN = TODAY_FIXTURE.rooms[0];

const CONFLICT = new ApiRequestError(
  'rejected',
  'Someone else changed this room. Reload and try again.',
  { status: 409, code: 'conflict' },
);

async function openKitchen(answers: FakeAnswers = {}): Promise<FakeApiClient> {
  window.history.replaceState(null, '', '/room?id=room-kitchen');
  const client = clientAnswering({ ...homeAnswers(), ...answers });
  renderWithApi(<RoomScreen />, client);
  await screen.findByRole('heading', { name: 'Kitchen', level: 1 });
  return client;
}

async function openEditSheet(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('button', { name: 'Edit room' }));
  return screen.findByRole('dialog', { name: 'Edit room' });
}

async function rename(sheet: HTMLElement, name: string): Promise<void> {
  const field = within(sheet).getByRole('textbox', { name: 'Name' });
  await userEvent.clear(field);
  if (name !== '') await userEvent.type(field, name);
  await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('editing a room', () => {
  it('has no accessibility violations', async () => {
    await openKitchen();
    await openEditSheet();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('renames the room, sending the version it read', async () => {
    const client = await openKitchen({
      [`PATCH ${KITCHEN_PATH}`]: () => Promise.resolve({ ...KITCHEN, name: 'Galley', version: 2 }),
    });
    const sheet = await openEditSheet();
    expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveValue('Kitchen');
    await rename(sheet, 'Galley');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(bodyOf(client, `PATCH ${KITCHEN_PATH}`)).toEqual({ name: 'Galley', version: 1 });
  });

  it('closes after saving, once the home shows the room’s new version', async () => {
    let saved = false;
    await openKitchen({
      [`PATCH ${KITCHEN_PATH}`]: () => {
        saved = true;
        return Promise.resolve({ ...KITCHEN, name: 'Galley', version: 2 });
      },
      [`GET ${HOME_PATH}/rooms`]: () =>
        Promise.resolve([saved ? { ...KITCHEN, name: 'Galley', version: 2 } : KITCHEN]),
    });
    await rename(await openEditSheet(), 'Galley');
    expect(await screen.findByRole('heading', { name: 'Galley', level: 1 })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('just closes when nothing changed', async () => {
    const client = await openKitchen();
    const sheet = await openEditSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(client.calls).not.toContain(`PATCH ${KITCHEN_PATH}`);
  });

  it.each([
    ['an empty name', '', 'Enter a name'],
    ['a name that is too long', 'K'.repeat(51), 'Keep it to 50 characters'],
  ])('explains %s and saves nothing', async (_case, name, message) => {
    const client = await openKitchen();
    const sheet = await openEditSheet();
    await rename(sheet, name);
    expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      message,
    );
    expect(client.calls).not.toContain(`PATCH ${KITCHEN_PATH}`);
  });

  it('offers to reload when someone else changed the room first', async () => {
    let roomReads = 0;
    const client = await openKitchen({
      [`PATCH ${KITCHEN_PATH}`]: () => Promise.reject(CONFLICT),
      [`GET ${HOME_PATH}/rooms`]: () => {
        roomReads += 1;
        const name = roomReads === 1 ? 'Kitchen' : 'Big kitchen';
        return Promise.resolve([{ ...KITCHEN, name, version: roomReads }]);
      },
    });
    const sheet = await openEditSheet();
    await rename(sheet, 'Galley');
    expect(await within(sheet).findByRole('alert')).toHaveTextContent(
      'Someone else changed this room',
    );
    await userEvent.click(within(sheet).getByRole('button', { name: 'Reload' }));
    await waitFor(() => {
      expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveValue('Big kitchen');
    });
    expect(within(sheet).queryByRole('alert')).not.toBeInTheDocument();
    expect(client.calls.filter((call) => call === `GET ${HOME_PATH}/rooms`)).toHaveLength(2);
  });

  it('says when the change could not be sent, and keeps what was typed', async () => {
    await openKitchen({
      [`PATCH ${KITCHEN_PATH}`]: () =>
        Promise.reject(new ApiRequestError('offline', 'Can’t reach Cleaning Planner.')),
    });
    const sheet = await openEditSheet();
    await rename(sheet, 'Galley');
    expect(await within(sheet).findByRole('alert')).toHaveTextContent(
      'Can’t reach Cleaning Planner.',
    );
    expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveValue('Galley');
    expect(within(sheet).queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
  });
});

describe('removing a room', () => {
  it('has no accessibility violations while asking', async () => {
    await openKitchen();
    const sheet = await openEditSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove room' }));
    await within(sheet).findByRole('button', { name: 'Remove' });
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('asks first, saying how many jobs go with it, then goes back to Home', async () => {
    const client = await openKitchen({
      [`DELETE ${KITCHEN_PATH}`]: () => Promise.resolve(undefined),
    });
    const sheet = await openEditSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove room' }));
    expect(
      await within(sheet).findByText(
        '“Kitchen” and its 3 jobs will be removed for everyone in this home. This can’t be undone.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove' }));
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/home');
    });
    expect(client.calls).toContain(`DELETE ${KITCHEN_PATH}`);
  });

  it('keeps the room when the person changes their mind', async () => {
    const client = await openKitchen();
    const sheet = await openEditSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove room' }));
    await userEvent.click(await within(sheet).findByRole('button', { name: 'Keep it' }));
    expect(within(sheet).getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(client.calls).not.toContain(`DELETE ${KITCHEN_PATH}`);
  });

  it('says when the room could not be removed, and stays', async () => {
    await openKitchen({
      [`DELETE ${KITCHEN_PATH}`]: () =>
        Promise.reject(new ApiRequestError('offline', 'Can’t reach Cleaning Planner.')),
    });
    const sheet = await openEditSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove room' }));
    await userEvent.click(await within(sheet).findByRole('button', { name: 'Remove' }));
    expect(await within(sheet).findByRole('alert')).toHaveTextContent(
      'Can’t reach Cleaning Planner.',
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each([
    ['no jobs', [], '“Kitchen” will be removed'],
    ['one job', [TODAY_FIXTURE.jobs[0]], '“Kitchen” and its 1 job will be removed'],
  ])('says so for a room with %s', async (_case, jobs, wording) => {
    await openKitchen({ [`GET ${HOME_PATH}/jobs`]: () => Promise.resolve(jobs) });
    const sheet = await openEditSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove room' }));
    expect(await within(sheet).findByText(new RegExp(`^${wording}`))).toBeInTheDocument();
  });
});

describe("changing a room's appliances", () => {
  const KITCHEN_WITH_OVEN = { ...KITCHEN, appliances: ['oven'] };

  it('ticks the appliances the room has and says what changing them does', async () => {
    await openKitchen({
      [`GET ${HOME_PATH}/rooms`]: () => Promise.resolve([KITCHEN_WITH_OVEN]),
    });
    const sheet = await openEditSheet();
    const appliances = within(sheet).getByRole('group', { name: 'Appliances' });
    expect(within(appliances).getByRole('checkbox', { name: 'Oven' })).toBeChecked();
    expect(within(appliances).getByRole('checkbox', { name: 'Dishwasher' })).not.toBeChecked();
    expect(sheet).toHaveTextContent(
      'Ticking one adds its usual jobs. Unticking one removes its jobs from this room.',
    );
  });

  it('sends only the appliances when only they changed, with the version it read', async () => {
    const client = await openKitchen({
      [`GET ${HOME_PATH}/rooms`]: () => Promise.resolve([KITCHEN_WITH_OVEN]),
      [`PATCH ${KITCHEN_PATH}`]: () =>
        Promise.resolve({ ...KITCHEN, appliances: ['dishwasher', 'oven'], version: 2 }),
    });
    const sheet = await openEditSheet();
    await userEvent.click(within(sheet).getByRole('checkbox', { name: 'Dishwasher' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(bodyOf(client, `PATCH ${KITCHEN_PATH}`)).toEqual({
      appliances: ['dishwasher', 'oven'],
      version: 1,
    });
  });

  it('sends both when the name and the appliances changed', async () => {
    const client = await openKitchen({
      [`PATCH ${KITCHEN_PATH}`]: () => Promise.resolve({ ...KITCHEN, version: 2 }),
    });
    const sheet = await openEditSheet();
    await userEvent.click(within(sheet).getByRole('checkbox', { name: 'Kettle' }));
    await rename(sheet, 'Galley');
    await waitFor(() => {
      expect(bodyOf(client, `PATCH ${KITCHEN_PATH}`)).toEqual({
        name: 'Galley',
        appliances: ['kettle'],
        version: 1,
      });
    });
  });

  it('offers no appliances for a room whose jobs need none', async () => {
    window.history.replaceState(null, '', '/room?id=room-bed');
    renderWithApi(<RoomScreen />, clientAnswering(homeAnswers()));
    await screen.findByRole('heading', { name: 'Bedroom', level: 1 });
    const sheet = await openEditSheet();
    expect(within(sheet).queryByRole('group', { name: 'Appliances' })).not.toBeInTheDocument();
  });
});
