import { afterEach, describe, expect, it } from 'vitest';
import { forgetPendingEmail, pendingEmail, rememberPendingEmail } from './pending-email';

afterEach(() => {
  forgetPendingEmail();
});

describe('the email waiting for a code', () => {
  it('is remembered for this tab until forgotten', () => {
    rememberPendingEmail('sam@example.com');
    expect(pendingEmail()).toBe('sam@example.com');
    forgetPendingEmail();
    expect(pendingEmail()).toBeNull();
  });
});
