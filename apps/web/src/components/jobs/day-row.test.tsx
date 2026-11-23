import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { DayRow } from './day-row';

const VACUUM = { name: 'Vacuum', icon: 'vacuum', state: 'toDo', effortMinutes: 20 } as const;
const BINS = { name: 'Empty the bins', icon: 'bins', state: 'done', effortMinutes: 5 } as const;

function dataTransfer(): { setData: () => void; dropEffect: string; effectAllowed: string } {
  return { setData: vi.fn(), dropEffect: 'none', effectAllowed: 'all' };
}

function isDropAllowed(row: HTMLElement): boolean {
  const dragOver = createEvent.dragOver(row, { dataTransfer: dataTransfer() });
  fireEvent(row, dragOver);
  return dragOver.defaultPrevented;
}

describe('DayRow dragging', () => {
  it('has no accessibility violations while it takes a drop', async () => {
    const { container } = render(
      <DayRow weekday="Wed" dayOfMonth={25} jobs={[BINS]} onDrop={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('lets a job that can move and be dragged be picked up', () => {
    const drag = { onStart: vi.fn(), onEnd: vi.fn() };
    render(
      <DayRow weekday="Tue" dayOfMonth={24} jobs={[{ ...VACUUM, onMove: vi.fn(), drag }, BINS]} />,
    );
    const vacuum = screen.getByRole('button', { name: 'Move Vacuum, to do' });
    expect(vacuum).toHaveAttribute('draggable', 'true');
    fireEvent.dragStart(vacuum, { dataTransfer: dataTransfer() });
    expect(drag.onStart).toHaveBeenCalledOnce();
    fireEvent.dragEnd(vacuum);
    expect(drag.onEnd).toHaveBeenCalledOnce();
  });

  it('leaves a job that can only be tapped undraggable', () => {
    render(<DayRow weekday="Tue" dayOfMonth={24} jobs={[{ ...VACUUM, onMove: vi.fn() }]} />);
    expect(screen.getByRole('button', { name: 'Move Vacuum, to do' })).not.toHaveAttribute(
      'draggable',
    );
  });

  it('takes a drop only when given somewhere to send it', () => {
    const onDrop = vi.fn();
    const { container, rerender } = render(
      <DayRow weekday="Wed" dayOfMonth={25} jobs={[]} onDrop={onDrop} />,
    );
    const row = container.firstElementChild;
    if (!(row instanceof HTMLElement)) throw new Error('No row');
    expect(isDropAllowed(row)).toBe(true);
    fireEvent.drop(row, { dataTransfer: dataTransfer() });
    expect(onDrop).toHaveBeenCalledOnce();
    rerender(<DayRow weekday="Wed" dayOfMonth={25} jobs={[]} />);
    expect(isDropAllowed(row)).toBe(false);
  });
});
