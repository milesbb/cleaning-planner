import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import { SignInFirst } from './sign-in-first';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): object => router }));

beforeEach(() => {
  router.replace.mockClear();
  window.history.replaceState(null, '', '/setup/rooms');
});

describe('SignInFirst', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(<SignInFirst />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sends someone with no session to Log in, coming back to this page', () => {
    renderWithAuth(<SignInFirst />);
    expect(router.replace).toHaveBeenCalledWith(
      `/sign-in?next=${encodeURIComponent('/setup/rooms')}`,
    );
  });

  it('lets someone who is signed in stay', () => {
    renderWithAuth(<SignInFirst />, stubAccountAuth({ mightBeSignedIn: () => true }));
    expect(router.replace).not.toHaveBeenCalled();
  });
});
