import { afterEach, describe, expect, it, vi } from 'vitest';
import { forgetPendingEmail, pendingEmail, rememberPendingEmail } from './pending-email';

afterEach(() => {
  vi.restoreAllMocks();
  forgetPendingEmail();
});

describe('the email waiting for a code', () => {
  it('is remembered for this tab only, so it never goes in a URL', () => {
    rememberPendingEmail('sam@example.com');
    expect(pendingEmail()).toBe('sam@example.com');
    expect(window.sessionStorage.length).toBe(1);
    expect(window.localStorage.length).toBe(0);
  });

  it('is gone once forgotten', () => {
    rememberPendingEmail('sam@example.com');
    forgetPendingEmail();
    expect(pendingEmail()).toBeNull();
  });

  it('is simply missing when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() => {
      rememberPendingEmail('sam@example.com');
    }).not.toThrow();
    expect(pendingEmail()).toBeNull();
  });
});
