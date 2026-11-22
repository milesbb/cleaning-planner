import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { AppShell } from './app-shell';
import { BottomSheet } from './bottom-sheet';
import { HomeSwitcher } from './home-switcher';
import { BackLink, PageHeader } from './page-header';
import { TabBar } from './tab-bar';

const HOMES = [
  { id: 'home-1', name: 'Our flat' },
  { id: 'home-2', name: "Mum's house" },
];

function SheetWithTrigger(): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Open sheet
      </button>
      <BottomSheet title="Your homes" open={isOpen} onOpenChange={setIsOpen}>
        <button type="button">First action</button>
      </BottomSheet>
    </>
  );
}

describe('TabBar', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<TabBar activeTab="today" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('links to the four main screens', () => {
    render(<TabBar activeTab="today" />);
    const navigation = screen.getByRole('navigation', { name: 'Main' });
    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/today');
    expect(screen.getByRole('link', { name: 'Week' })).toHaveAttribute('href', '/week');
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/home');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });

  it('marks only the active tab as the current page', () => {
    render(<TabBar activeTab="week" />);
    expect(screen.getByRole('link', { name: 'Week' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current');
  });
});

describe('AppShell', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <AppShell activeTab="home">
        <h1>Home</h1>
      </AppShell>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('puts the page in the main landmark next to the navigation', () => {
    render(
      <AppShell activeTab="home">
        <h1>Home</h1>
      </AppShell>,
    );
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: 'Home' }),
    );
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });
});

describe('BottomSheet', () => {
  it('has no accessibility violations when open', async () => {
    render(
      <BottomSheet title="Your homes" description="Switch home" open onOpenChange={vi.fn()}>
        <p>Content</p>
      </BottomSheet>,
    );
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('is a dialog named by its title', () => {
    render(
      <BottomSheet title="Your homes" open onOpenChange={vi.fn()}>
        <p>Content</p>
      </BottomSheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Your homes' })).toBeInTheDocument();
  });

  it('moves focus in when it opens and back to the trigger when it closes', async () => {
    render(<SheetWithTrigger />);
    const trigger = screen.getByRole('button', { name: 'Open sheet' });
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it('closes with Escape', async () => {
    render(<SheetWithTrigger />);
    await userEvent.click(screen.getByRole('button', { name: 'Open sheet' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps focus inside while open', async () => {
    render(<SheetWithTrigger />);
    await userEvent.click(screen.getByRole('button', { name: 'Open sheet' }));
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });
});

describe('HomeSwitcher', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <HomeSwitcher homes={HOMES} currentHomeId="home-1" onSwitch={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the current home and lists every home when pressed', async () => {
    render(<HomeSwitcher homes={HOMES} currentHomeId="home-1" onSwitch={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Our flat, switch home' }));
    const sheet = screen.getByRole('dialog', { name: 'Your homes' });
    expect(sheet).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Our flat' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('button', { name: "Mum's house" })).not.toHaveAttribute('aria-current');
  });

  it('switches home and closes', async () => {
    const onSwitch = vi.fn();
    render(<HomeSwitcher homes={HOMES} currentHomeId="home-1" onSwitch={onSwitch} />);
    await userEvent.click(screen.getByRole('button', { name: 'Our flat, switch home' }));
    await userEvent.click(screen.getByRole('button', { name: "Mum's house" }));
    expect(onSwitch).toHaveBeenCalledWith('home-2');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers to start or join another home', async () => {
    render(<HomeSwitcher homes={HOMES} currentHomeId="home-1" onSwitch={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Our flat, switch home' }));
    expect(screen.getByRole('link', { name: 'Start or join a home' })).toHaveAttribute(
      'href',
      '/homes/new',
    );
  });
});

describe('PageHeader', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <PageHeader
        title="Kitchen"
        subtitle="8 jobs"
        leading={<BackLink href="/home" label="Back to Home" />}
        action={<button type="button">Edit</button>}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the title as the page heading with its subtitle', () => {
    render(<PageHeader title="Today" subtitle="Sunday 22 November" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
    expect(screen.getByText('Sunday 22 November')).toBeInTheDocument();
  });

  it('has a labelled back link', () => {
    render(<PageHeader title="Kitchen" leading={<BackLink href="/home" label="Back to Home" />} />);
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/home');
  });
});
