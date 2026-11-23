import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { TODAY_FIXTURE } from '@/app/today/today-fixture';
import { ApiRequestError } from '@/lib/api/api-client';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { HOME_PATH, homeAnswers } from '@/test/fake-home-answers';
import { AddJobScreen } from './add-job-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/room/add',
}));

const ADD_JOB = `POST ${HOME_PATH}/jobs`;
const NEW_JOB = { ...TODAY_FIXTURE.jobs[0], id: 'job-new', name: 'Wipe the fridge shelves' };

// The kitchen already has the library's "Clean the oven".
function kitchenWithLibraryOven(extraAnswers: FakeAnswers = {}): FakeAnswers {
  return {
    ...homeAnswers(),
    [`GET ${HOME_PATH}/jobs`]: () =>
      Promise.resolve(
        TODAY_FIXTURE.jobs.map((job) =>
          job.id === 'job-oven' ? { ...job, libraryId: 'kitchen.oven' } : job,
        ),
      ),
    [ADD_JOB]: () => Promise.resolve(NEW_JOB),
    ...extraAnswers,
  };
}

async function openAddJob(
  address = '/room/add?id=room-kitchen',
  answers: FakeAnswers = kitchenWithLibraryOven(),
): Promise<FakeApiClient> {
  window.history.replaceState(null, '', address);
  const client = clientAnswering(answers);
  renderWithApi(<AddJobScreen />, client);
  const heading = await screen.findByRole('heading', { level: 1 });
  if (heading.textContent !== 'Room not found') {
    await screen.findByRole('list', { name: 'Jobs from the library' });
  }
  return client;
}

function libraryList(): HTMLElement {
  return screen.getByRole('list', { name: 'Jobs from the library' });
}

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('AddJobScreen', () => {
  it('has no accessibility violations', async () => {
    window.history.replaceState(null, '', '/room/add?id=room-kitchen');
    const { container } = renderWithApi(
      <AddJobScreen />,
      clientAnswering(kitchenWithLibraryOven()),
    );
    await screen.findByRole('list', { name: 'Jobs from the library' });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting the room while it loads', () => {
    window.history.replaceState(null, '', '/room/add?id=room-kitchen');
    renderWithApi(
      <AddJobScreen />,
      clientAnswering({
        ...kitchenWithLibraryOven(),
        [`GET ${HOME_PATH}/rooms`]: () => new Promise(() => undefined),
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Getting the room');
  });

  it('lists the room’s library jobs, marking the ones already added', async () => {
    await openAddJob();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    const oven = within(libraryList()).getByText('Clean the oven').closest('li');
    expect(oven).toHaveTextContent('Added');
    expect(
      within(libraryList()).getByRole('button', {
        name: 'Add Clear out the fridge and wipe the shelves',
      }),
    ).toBeInTheDocument();
    expect(within(libraryList()).queryByText('Change the bed sheets')).not.toBeInTheDocument();
  });

  it('searches every room’s jobs when asked', async () => {
    await openAddJob();
    await userEvent.click(screen.getByRole('radio', { name: 'All rooms' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search jobs' }), 'sheets');
    const found = within(libraryList()).getAllByRole('listitem');
    expect(found.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Change the bed sheets'),
    ]);
  });

  it('says when nothing matches', async () => {
    await openAddJob();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search jobs' }), 'trampoline');
    expect(screen.getByText('No jobs match “trampoline”.')).toBeInTheDocument();
  });

  it('adds a library job with one tap, with its usual timing, for anyone', async () => {
    const client = await openAddJob();
    await userEvent.click(
      screen.getByRole('button', { name: 'Add Clear out the fridge and wipe the shelves' }),
    );
    await waitFor(() => {
      expect(client.calls).toContain(ADD_JOB);
    });
    expect(client.bodies[client.calls.indexOf(ADD_JOB)]).toEqual({
      roomId: 'room-kitchen',
      libraryId: 'kitchen.fridge-wipe',
      name: 'Clear out the fridge and wipe the shelves',
      icon: 'fridge',
      schedule: { type: 'floating', every: { value: 1, unit: 'week' } },
      assignment: { kind: 'anyone' },
      effortMinutes: 10,
    });
  });

  it('explains when a job cannot be added', async () => {
    await openAddJob(
      '/room/add?id=room-kitchen',
      kitchenWithLibraryOven({
        [ADD_JOB]: () => Promise.reject(new ApiRequestError('rejected', 'That room has gone')),
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Add Clear out the fridge and wipe the shelves' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('That room has gone');
  });

  it('makes your own job, then opens it to fine-tune', async () => {
    const client = await openAddJob();
    await userEvent.click(screen.getByRole('button', { name: 'Make your own job' }));
    const sheet = await screen.findByRole('dialog', { name: 'Make your own job' });
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'Name' }), 'Water the plants');
    await userEvent.click(within(sheet).getByRole('button', { name: 'More weeks' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Add job' }));
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/job?id=job-new');
    });
    expect(client.bodies[client.calls.indexOf(ADD_JOB)]).toEqual({
      roomId: 'room-kitchen',
      name: 'Water the plants',
      icon: 'spray',
      schedule: { type: 'floating', every: { value: 2, unit: 'week' } },
      assignment: { kind: 'anyone' },
      effortMinutes: 15,
    });
  });

  it('needs a name for your own job', async () => {
    const client = await openAddJob();
    await userEvent.click(screen.getByRole('button', { name: 'Make your own job' }));
    const sheet = await screen.findByRole('dialog', { name: 'Make your own job' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Add job' }));
    expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      /Enter a name for the job/,
    );
    expect(client.calls).not.toContain(ADD_JOB);
  });

  it.each([
    ['a room that was removed', '/room/add?id=room-gone'],
    ['a link without a room', '/room/add'],
  ])('explains %s', async (_case, address) => {
    await openAddJob(address);
    expect(screen.getByRole('heading', { name: 'Room not found' })).toBeInTheDocument();
  });
});
