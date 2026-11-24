import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import { forgetHomeSetup } from '@/lib/setup/home-setup-draft';
import SetupRoomsPage from './page';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): typeof router => router }));

const signedIn = stubAccountAuth({ mightBeSignedIn: () => true });

afterEach(() => {
  vi.clearAllMocks();
  forgetHomeSetup();
});

async function continueToNextStep(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('Setup: pick rooms', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(<SetupRoomsPage />, signedIn);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows step 1 of 3 and goes back to start or join', () => {
    renderWithAuth(<SetupRoomsPage />, signedIn);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/homes/new');
  });

  it('starts from a typical home and continues to appliances', async () => {
    renderWithAuth(<SetupRoomsPage />, signedIn);
    expect(screen.getByRole('switch', { name: 'Kitchen' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Office' })).not.toBeChecked();
    await continueToNextStep();
    expect(router.push).toHaveBeenCalledWith('/setup/appliances');
  });

  it('counts bathrooms and bedrooms, and keeps the choices for the next screens', async () => {
    const { unmount } = renderWithAuth(<SetupRoomsPage />, signedIn);
    await userEvent.click(screen.getByRole('button', { name: 'More bedrooms' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Office' }));
    await userEvent.clear(screen.getByLabelText('Home name'));
    await userEvent.type(screen.getByLabelText('Home name'), 'Our flat');
    unmount();
    renderWithAuth(<SetupRoomsPage />, signedIn);
    expect(screen.getByLabelText('Home name')).toHaveValue('Our flat');
    expect(screen.getByRole('switch', { name: 'Office' })).toBeChecked();
    expect(screen.getByText('2', { selector: 'output' })).toBeInTheDocument();
  });

  it('needs a name for the home', async () => {
    renderWithAuth(<SetupRoomsPage />, signedIn);
    await userEvent.clear(screen.getByLabelText('Home name'));
    await continueToNextStep();
    expect(screen.getByLabelText('Home name')).toHaveAccessibleDescription(/Enter a name/);
    expect(screen.getByLabelText('Home name')).toHaveFocus();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('needs at least one room', async () => {
    renderWithAuth(<SetupRoomsPage />, signedIn);
    for (const room of ['Kitchen', 'Living room']) {
      await userEvent.click(screen.getByRole('switch', { name: room }));
    }
    for (const rooms of ['bathrooms', 'bedrooms']) {
      await userEvent.click(screen.getByRole('button', { name: `Fewer ${rooms}` }));
    }
    await continueToNextStep();
    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least one room');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('asks someone signed out to log in before picking rooms', () => {
    window.history.replaceState(null, '', '/setup/rooms');
    renderWithAuth(<SetupRoomsPage />);
    expect(router.replace).toHaveBeenCalledWith(
      `/sign-in?next=${encodeURIComponent('/setup/rooms')}`,
    );
  });
});
