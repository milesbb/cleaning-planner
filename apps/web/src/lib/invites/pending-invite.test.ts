import { afterEach, describe, expect, it } from 'vitest';
import { forgetPendingInvite, pendingInvite, rememberPendingInvite } from './pending-invite';

afterEach(() => {
  forgetPendingInvite();
});

describe('the invite waiting for someone to sign up or log in', () => {
  it('is remembered for this tab until forgotten', () => {
    rememberPendingInvite('7K3M9QZA');
    expect(pendingInvite()).toBe('7K3M9QZA');
    forgetPendingInvite();
    expect(pendingInvite()).toBeNull();
  });

  it('is kept apart from the pending email', () => {
    rememberPendingInvite('7K3M9QZA');
    expect(window.sessionStorage.getItem('cleaning-planner.pending-email')).toBeNull();
  });
});
