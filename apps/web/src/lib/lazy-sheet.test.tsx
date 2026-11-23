import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { lazy, useState } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { LazySheet } from './lazy-sheet';
import type { SheetOpening } from './lazy-sheet';

function CounterSheet({ open, onOpenChange, returnFocusTo }: SheetOpening): ReactNode {
  const [taps, setTaps] = useState(0);
  if (!open) return null;
  return (
    <div role="dialog" aria-label="Counter">
      <p>{`Tapped ${String(taps)} times`}</p>
      <button
        type="button"
        onClick={() => {
          setTaps(taps + 1);
        }}
      >
        Tap
      </button>
      <button
        type="button"
        onClick={() => {
          onOpenChange(false);
          returnFocusTo.current?.focus();
        }}
      >
        Close
      </button>
    </div>
  );
}

function renderSheet(): { load: ReturnType<typeof vi.fn> } {
  const load = vi.fn(() => Promise.resolve({ default: CounterSheet }));
  const LoadedSheet = lazy(load);
  render(
    <LazySheet
      trigger={(triggerProps) => (
        <button type="button" {...triggerProps}>
          Open counter
        </button>
      )}
      sheet={(opening) => <LoadedSheet {...opening} />}
    />,
  );
  return { load };
}

describe('LazySheet', () => {
  it('has no accessibility violations', async () => {
    renderSheet();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('only loads the sheet once it is first opened', async () => {
    const { load } = renderSheet();
    expect(load).not.toHaveBeenCalled();
    const trigger = screen.getByRole('button', { name: 'Open counter' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Counter' })).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(load).toHaveBeenCalledOnce();
  });

  it('gives focus back to the button that opened it', async () => {
    renderSheet();
    const trigger = screen.getByRole('button', { name: 'Open counter' });
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('starts afresh each time it opens, without loading again', async () => {
    const { load } = renderSheet();
    await userEvent.click(screen.getByRole('button', { name: 'Open counter' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Tap' }));
    expect(screen.getByText('Tapped 1 times')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open counter' }));
    await waitFor(() => {
      expect(screen.getByText('Tapped 0 times')).toBeInTheDocument();
    });
    expect(load).toHaveBeenCalledOnce();
  });
});
