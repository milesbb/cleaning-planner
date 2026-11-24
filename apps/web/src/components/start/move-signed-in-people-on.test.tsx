import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import { MoveSignedInPeopleOn } from './move-signed-in-people-on';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): object => router }));

beforeEach(() => {
  router.replace.mockClear();
  window.history.replaceState(null, '', '/welcome');
});

describe('MoveSignedInPeopleOn', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(<MoveSignedInPeopleOn />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sends someone who is signed in to the start, which picks Today or Start or join', async () => {
    renderWithAuth(
      <MoveSignedInPeopleOn />,
      stubAccountAuth({ mightBeSignedIn: () => true, isSignedIn: () => Promise.resolve(true) }),
    );
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });
  });

  it('sends them back to the page Log in was asked to return to', async () => {
    window.history.replaceState(null, '', `/sign-in?next=${encodeURIComponent('/week')}`);
    renderWithAuth(
      <MoveSignedInPeopleOn />,
      stubAccountAuth({ mightBeSignedIn: () => true, isSignedIn: () => Promise.resolve(true) }),
    );
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/week');
    });
  });

  it('leaves someone with an expired session where they are', async () => {
    const isSignedIn = vi.fn(() => Promise.resolve(false));
    renderWithAuth(
      <MoveSignedInPeopleOn />,
      stubAccountAuth({ mightBeSignedIn: () => true, isSignedIn }),
    );
    await waitFor(() => {
      expect(isSignedIn).toHaveBeenCalled();
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('never downloads sign-in for someone with no session at all', () => {
    const isSignedIn = vi.fn(() => Promise.resolve(true));
    renderWithAuth(<MoveSignedInPeopleOn />, stubAccountAuth({ isSignedIn }));
    expect(isSignedIn).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
