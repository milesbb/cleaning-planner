import { afterEach, describe, expect, it, vi } from 'vitest';
import { homeToday } from './home-day';

afterEach(() => {
  vi.useRealTimers();
});

describe('homeToday', () => {
  it('is the date in the home’s time zone, not the device’s', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T20:00:00Z'));
    expect(homeToday({ timeZone: 'Europe/London' })).toBe('2026-11-24');
    expect(homeToday({ timeZone: 'Australia/Sydney' })).toBe('2026-11-25');
  });
});
