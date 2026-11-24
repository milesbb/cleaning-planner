import { describe, expect, it, vi } from 'vitest';
import { sendToSignIn } from './send-to-sign-in';

describe('sendToSignIn', () => {
  it('forgets this device’s session before opening Log in, coming back to the same page', async () => {
    const steps: string[] = [];
    await sendToSignIn(
      {
        signOut: () => {
          steps.push('signed out');
          return Promise.resolve();
        },
      },
      (path) => steps.push(`opened ${path}`),
      '/room?id=room-1',
    );
    expect(steps).toEqual([
      'signed out',
      `opened /sign-in?next=${encodeURIComponent('/room?id=room-1')}`,
    ]);
  });

  it('still opens Log in when signing out fails', async () => {
    const goTo = vi.fn();
    await sendToSignIn({ signOut: () => Promise.reject(new Error('offline')) }, goTo, '/');
    expect(goTo).toHaveBeenCalledWith('/sign-in');
  });
});
