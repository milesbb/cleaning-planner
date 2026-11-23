import { afterEach, describe, expect, it } from 'vitest';
import { rememberReminderTime } from './reminder-preference';

afterEach(() => {
  window.localStorage.clear();
});

describe('rememberReminderTime', () => {
  it('keeps the reminder time on this device for the reminder settings', () => {
    rememberReminderTime('evening');
    expect(window.localStorage.getItem('cleaning-planner.reminder-time')).toBe('evening');
  });
});
