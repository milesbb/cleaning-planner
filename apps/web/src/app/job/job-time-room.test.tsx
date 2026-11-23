import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { TODAY_FIXTURE } from '@/app/today/today-fixture';
import type { FakeApiClient } from '@/test/fake-api-client';
import { OVEN_PATH, bodyOf, openOven } from '@/test/open-job';

vi.mock('next/navigation', () => ({
  useRouter: (): object => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: (): string => '/job',
}));

const UPDATE_OVEN = `PATCH ${OVEN_PATH}`;

function savedOven(changes: object): () => Promise<unknown> {
  const oven = TODAY_FIXTURE.jobs.find((job) => job.id === 'job-oven');
  return () => Promise.resolve({ ...oven, ...changes, version: 2 });
}

async function openSheet(trigger: string, title: string): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('button', { name: trigger }));
  return screen.findByRole('dialog', { name: title });
}

function openTimeSheet(): Promise<HTMLElement> {
  return openSheet('Change how long it takes', 'How long it takes');
}

function openRoomSheet(): Promise<HTMLElement> {
  return openSheet('Move to another room', 'Move to another room');
}

async function save(sheet: HTMLElement): Promise<void> {
  await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
}

function closed(): Promise<void> {
  return waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
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

describe('How long it takes', () => {
  it('has no accessibility violations with the sheet open', async () => {
    await openOven();
    await openTimeSheet();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('says how long the job takes', async () => {
    await openOven();
    expect(screen.getByRole('region', { name: 'How long it takes' })).toHaveTextContent(
      'About 30 minutes',
    );
  });

  it('changes it in 5-minute steps, sending the version it read', async () => {
    const client: FakeApiClient = await openOven({
      [UPDATE_OVEN]: savedOven({ effortMinutes: 40 }),
    });
    const sheet = await openTimeSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: 'More minutes' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'More minutes' }));
    await save(sheet);
    await closed();
    expect(bodyOf(client, UPDATE_OVEN)).toEqual({ effortMinutes: 40, version: 1 });
  });

  it('sends nothing when nothing changed', async () => {
    const client = await openOven();
    await save(await openTimeSheet());
    await closed();
    expect(client.calls).not.toContain(UPDATE_OVEN);
  });

  it('keeps the sheet open and explains when saving fails', async () => {
    await openOven({
      [UPDATE_OVEN]: () =>
        Promise.reject(new ApiRequestError('rejected', 'Someone else changed this job')),
    });
    const sheet = await openTimeSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Fewer minutes' }));
    await save(sheet);
    expect(await within(sheet).findByRole('alert')).toHaveTextContent(
      'Someone else changed this job',
    );
  });
});

describe('Room', () => {
  it('has no accessibility violations with the sheet open', async () => {
    await openOven();
    await openRoomSheet();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('moves the job to another of the home’s rooms', async () => {
    const client = await openOven({ [UPDATE_OVEN]: savedOven({ roomId: 'room-bed' }) });
    const sheet = await openRoomSheet();
    const room = within(sheet).getByRole('combobox', { name: 'Room' });
    expect(
      within(room)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Kitchen', 'Living room', 'Bedroom']);
    await userEvent.selectOptions(room, 'Bedroom');
    await save(sheet);
    await closed();
    expect(bodyOf(client, UPDATE_OVEN)).toEqual({ roomId: 'room-bed', version: 1 });
  });

  it('sends nothing when the room stays the same', async () => {
    const client = await openOven();
    await save(await openRoomSheet());
    await closed();
    expect(client.calls).not.toContain(UPDATE_OVEN);
  });

  it('keeps the sheet open and explains when moving fails', async () => {
    await openOven({
      [UPDATE_OVEN]: () => Promise.reject(new ApiRequestError('rejected', 'That room has gone')),
    });
    const sheet = await openRoomSheet();
    await userEvent.selectOptions(within(sheet).getByRole('combobox', { name: 'Room' }), 'Bedroom');
    await save(sheet);
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('That room has gone');
  });
});
