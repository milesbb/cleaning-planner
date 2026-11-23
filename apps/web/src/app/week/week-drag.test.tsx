import { createEvent, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { keyedBodyOf } from '@/test/open-job';
import { NEVER, SNOOZE_VACUUM, dayRow, openWeek, weekAnswers } from './week-test-support';

vi.mock('next/navigation', () => ({
  useRouter: (): object => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: (): string => '/week',
}));

const MOVE_VACUUM = 'Move Vacuum the living room, to do';

function aMouseOnALaptop(isLaptop: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: isLaptop && query === '(min-width: 1024px) and (pointer: fine)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

function dataTransfer(): object {
  return { setData: vi.fn(), dropEffect: 'none', effectAllowed: 'all' };
}

function days(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'Days' })).getAllByRole('listitem');
}

function rowOf(index: number): HTMLElement {
  const row = dayRow(days(), index).firstElementChild;
  if (!(row instanceof HTMLElement)) throw new Error(`No row for day ${String(index)}`);
  return row;
}

function takesDrop(index: number): boolean {
  const row = rowOf(index);
  const dragOver = createEvent.dragOver(row, { dataTransfer: dataTransfer() });
  fireEvent(row, dragOver);
  return dragOver.defaultPrevented;
}

async function pickUpVacuum(): Promise<HTMLElement> {
  const vacuum = await screen.findByRole('button', { name: MOVE_VACUUM });
  fireEvent.dragStart(vacuum, { dataTransfer: dataTransfer() });
  return vacuum;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T09:00:00Z'));
  aMouseOnALaptop(true);
});

afterEach(() => {
  aMouseOnALaptop(false);
  vi.useRealTimers();
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('Dragging a job on Week', () => {
  it('has no accessibility violations mid-drag', async () => {
    openWeek();
    await pickUpVacuum();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('lets jobs that can move be dragged on a laptop', async () => {
    openWeek();
    expect(await screen.findByRole('button', { name: MOVE_VACUUM })).toHaveAttribute(
      'draggable',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Move Wipe the hob, late' })).toHaveAttribute(
      'draggable',
      'true',
    );
  });

  it('leaves dragging out on touch screens and narrow windows', async () => {
    aMouseOnALaptop(false);
    openWeek();
    expect(await screen.findByRole('button', { name: MOVE_VACUUM })).not.toHaveAttribute(
      'draggable',
    );
  });

  it('only lets the job drop on the days it could move to', async () => {
    openWeek();
    await pickUpVacuum();
    expect(takesDrop(0)).toBe(false);
    expect(takesDrop(1)).toBe(false);
    expect(takesDrop(2)).toBe(true);
    expect(takesDrop(6)).toBe(true);
  });

  it('takes no drops once the drag ends', async () => {
    openWeek();
    fireEvent.dragEnd(await pickUpVacuum());
    expect(takesDrop(2)).toBe(false);
  });

  it('moves the job at once when dropped, as a snooze to that day', async () => {
    const client = openWeek({ ...weekAnswers(), [SNOOZE_VACUUM]: NEVER });
    await pickUpVacuum();
    fireEvent.drop(rowOf(3), { dataTransfer: dataTransfer() });

    expect(
      await within(dayRow(days(), 3)).findByRole('img', { name: 'Vacuum the living room, to do' }),
    ).toBeInTheDocument();
    expect(within(dayRow(days(), 1)).queryByText(/Vacuum/)).toBeNull();
    expect(keyedBodyOf(client, SNOOZE_VACUUM)).toEqual({ until: '2026-11-26' });
  });

  it('puts the job back and says why when the move is refused', async () => {
    openWeek({
      ...weekAnswers(),
      [SNOOZE_VACUUM]: () =>
        Promise.reject(new ApiRequestError('rejected', 'Snooze to a later day')),
    });
    await pickUpVacuum();
    fireEvent.drop(rowOf(2), { dataTransfer: dataTransfer() });
    expect(await screen.findByRole('alert')).toHaveTextContent('Snooze to a later day');
    await waitFor(() => {
      expect(
        within(dayRow(days(), 1)).getByRole('button', { name: MOVE_VACUUM }),
      ).toBeInTheDocument();
    });
  });
});
