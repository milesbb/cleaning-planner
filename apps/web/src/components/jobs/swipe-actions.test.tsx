import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { SwipeActions } from './swipe-actions';

const START = { clientX: 300, clientY: 100 };

function renderRow(): { onSkip: () => void; onSnooze: () => void; onRowClick: () => void } {
  const onSkip = vi.fn();
  const onSnooze = vi.fn();
  const onRowClick = vi.fn();
  render(
    <SwipeActions
      actions={[
        { label: 'Snooze a day', icon: null, onSelect: onSnooze },
        { label: 'Skip', icon: null, onSelect: onSkip },
      ]}
    >
      <button type="button" onClick={onRowClick}>
        Wipe the hob
      </button>
    </SwipeActions>,
  );
  return { onSkip, onSnooze, onRowClick };
}

function swipe(distanceAcross: number, distanceDown = 0, pointerType = 'touch'): void {
  const row = screen.getByRole('button', { name: 'Wipe the hob' });
  fireEvent.pointerDown(row, { ...START, pointerType });
  fireEvent.pointerMove(row, {
    clientX: START.clientX + distanceAcross / 2,
    clientY: START.clientY + distanceDown / 2,
    pointerType,
  });
  fireEvent.pointerMove(row, {
    clientX: START.clientX + distanceAcross,
    clientY: START.clientY + distanceDown,
    pointerType,
  });
  fireEvent.pointerUp(row, {
    clientX: START.clientX + distanceAcross,
    clientY: START.clientY + distanceDown,
    pointerType,
  });
}

describe('SwipeActions', () => {
  it('has no accessibility violations, open or closed', async () => {
    const { container } = render(
      <SwipeActions actions={[{ label: 'Skip', icon: null, onSelect: vi.fn() }]}>
        <p>Wipe the hob</p>
      </SwipeActions>,
    );
    expect(await axe(container)).toHaveNoViolations();
    const row = screen.getByText('Wipe the hob');
    fireEvent.pointerDown(row, { ...START, pointerType: 'touch' });
    fireEvent.pointerMove(row, { clientX: 100, clientY: 100, pointerType: 'touch' });
    fireEvent.pointerUp(row, { clientX: 100, clientY: 100, pointerType: 'touch' });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps the actions out of the way until the row is swiped', () => {
    renderRow();
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  });

  it('shows the actions when the row is swiped left far enough', () => {
    renderRow();
    swipe(-120);
    expect(screen.getByRole('button', { name: 'Snooze a day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('runs an action and closes', async () => {
    const { onSkip } = renderRow();
    swipe(-120);
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  });

  it('springs back after a short swipe', () => {
    renderRow();
    swipe(-40);
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  });

  it('leaves scrolling, mouse drags and swipes to the right alone', () => {
    renderRow();
    swipe(-30, -120);
    swipe(-120, 0, 'mouse');
    swipe(120);
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  });

  it('does not open the row when the swipe ends', () => {
    const { onRowClick } = renderRow();
    swipe(-120);
    fireEvent.click(screen.getByRole('button', { name: 'Wipe the hob' }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('closes on a tap of the open row, then lets the next tap through', async () => {
    const { onRowClick } = renderRow();
    swipe(-120);
    fireEvent.click(screen.getByRole('button', { name: 'Wipe the hob' }));
    await userEvent.click(screen.getByRole('button', { name: 'Wipe the hob' }));
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Wipe the hob' }));
    expect(onRowClick).toHaveBeenCalledOnce();
  });

  it('swipes back to the right to close', () => {
    renderRow();
    swipe(-120);
    swipe(120);
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  });
});
