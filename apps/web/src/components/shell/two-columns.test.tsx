import { render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { AppShell } from './app-shell';
import { BottomSheet } from './bottom-sheet';
import { ChooseAJobHint } from './choose-a-job-hint';
import { TwoColumns } from './two-columns';
import { LAPTOP_MEDIA_QUERY, useIsLaptop } from './use-is-laptop';
import { fakeScreenOf, restoreScreen } from '@/test/fake-screen';

afterEach(restoreScreen);

describe('TwoColumns', () => {
  it('has no accessibility violations', async () => {
    fakeScreenOf(true);
    const { container } = render(
      <TwoColumns main={<p>Jobs</p>} side={<p>The week</p>} sideLabel="This week" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('puts the side content in a region named by its label, after the main content', () => {
    fakeScreenOf(true);
    render(<TwoColumns main={<p>Jobs</p>} side={<p>The week</p>} sideLabel="This week" />);
    const side = screen.getByRole('region', { name: 'This week' });
    expect(side).toHaveTextContent('The week');
    expect(
      screen.getByText('Jobs').compareDocumentPosition(side) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('stacks the side content under the main content below laptop width when asked', () => {
    fakeScreenOf(false);
    render(
      <TwoColumns
        main={<p>Rooms</p>}
        side={<p>Recently</p>}
        sideLabel="Recently"
        sideBelowLaptop="stacked"
      />,
    );
    expect(screen.getByRole('region', { name: 'Recently' })).toBeInTheDocument();
  });

  it('leaves hidden side content out of the page below laptop width', () => {
    fakeScreenOf(false);
    render(
      <TwoColumns
        main={<p>Jobs</p>}
        side={<p>The week</p>}
        sideLabel="This week"
        sideBelowLaptop="hidden"
      />,
    );
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'This week' })).not.toBeInTheDocument();
    expect(screen.queryByText('The week')).not.toBeInTheDocument();
  });

  it('shows hidden side content once the window is laptop width', () => {
    const fakeScreen = fakeScreenOf(false);
    render(
      <TwoColumns
        main={<p>Jobs</p>}
        side={<p>The week</p>}
        sideLabel="This week"
        sideBelowLaptop="hidden"
      />,
    );
    fakeScreen.resize(true);
    expect(screen.getByRole('region', { name: 'This week' })).toBeInTheDocument();
  });
});

describe('useIsLaptop', () => {
  it('says whether the window is at least 1024px wide, following changes', () => {
    const fakeScreen = fakeScreenOf(true);
    const { result } = renderHook(() => useIsLaptop());
    expect(result.current).toBe(true);
    fakeScreen.resize(false);
    expect(result.current).toBe(false);
  });

  it('asks for 1024px and wider', () => {
    expect(LAPTOP_MEDIA_QUERY).toBe('(min-width: 1024px)');
  });
});

describe('ChooseAJobHint', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<ChooseAJobHint />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says what choosing a job shows', () => {
    render(<ChooseAJobHint />);
    expect(
      screen.getByText("Choose a job to see when it's due, who does it and how."),
    ).toBeInTheDocument();
  });
});

describe('AppShell layouts', () => {
  it('keeps the column layout narrow and lets the split layout widen on laptops', () => {
    const { rerender } = render(
      <AppShell activeTab="today">
        <h1>Today</h1>
      </AppShell>,
    );
    const contentOf = (): HTMLElement | null => screen.getByRole('heading').parentElement;
    expect(contentOf()).toHaveClass('max-w-3xl');
    expect(contentOf()).not.toHaveClass('lg:max-w-7xl');
    rerender(
      <AppShell activeTab="today" layout="split">
        <h1>Today</h1>
      </AppShell>,
    );
    expect(contentOf()).toHaveClass('max-w-3xl', 'lg:max-w-7xl');
  });
});

describe('BottomSheet sizes', () => {
  it('has no accessibility violations when wide', async () => {
    render(
      <BottomSheet title="Add a room" size="wide" open onOpenChange={vi.fn()}>
        <p>Room types</p>
      </BottomSheet>,
    );
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('is wider from tablet width only when asked to be', () => {
    const { rerender } = render(
      <BottomSheet title="Snooze" open onOpenChange={vi.fn()}>
        <p>Choices</p>
      </BottomSheet>,
    );
    expect(screen.getByRole('dialog')).not.toHaveClass('md:w-[min(40rem,calc(100vw-2rem))]');
    rerender(
      <BottomSheet title="Snooze" size="wide" open onOpenChange={vi.fn()}>
        <p>Choices</p>
      </BottomSheet>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('md:w-[min(40rem,calc(100vw-2rem))]');
  });
});
