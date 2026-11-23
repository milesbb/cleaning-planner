import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { forgetHomeSetup } from '@/lib/setup/home-setup-draft';
import SetupAppliancesPage from './page';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): typeof router => router }));

afterEach(() => {
  vi.clearAllMocks();
  forgetHomeSetup();
});

describe('Setup: appliances and floors', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<SetupAppliancesPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows step 2 of 3 and goes back to the rooms', () => {
    render(<SetupAppliancesPage />);
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/setup/rooms');
  });

  it('keeps what you switch on or off when you come back', async () => {
    const { unmount } = render(<SetupAppliancesPage />);
    expect(screen.getByRole('switch', { name: 'Oven' })).toBeChecked();
    await userEvent.click(screen.getByRole('switch', { name: 'Dishwasher' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Oven' }));
    unmount();
    render(<SetupAppliancesPage />);
    expect(screen.getByRole('switch', { name: 'Dishwasher' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Oven' })).not.toBeChecked();
  });

  it('continues to reminders', async () => {
    render(<SetupAppliancesPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(router.push).toHaveBeenCalledWith('/setup/reminders');
  });
});
