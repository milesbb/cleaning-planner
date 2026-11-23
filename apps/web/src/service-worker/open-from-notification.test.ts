import { describe, expect, it, vi } from 'vitest';
import { openFromNotification } from './open-from-notification';
import type { AppWindow, AppWindows } from './open-from-notification';

const ORIGIN = 'https://cleaning.example';

function openWindow(): AppWindow {
  return {
    focus: vi.fn(() => Promise.resolve()),
    navigate: vi.fn(() => Promise.resolve()),
  };
}

function windowsWith(open: AppWindow[]): AppWindows {
  return {
    matchAll: vi.fn(() => Promise.resolve(open)),
    openWindow: vi.fn(() => Promise.resolve()),
  };
}

describe('openFromNotification', () => {
  it('brings the open app forward on the page the reminder names', async () => {
    const appWindow = openWindow();
    const windows = windowsWith([appWindow]);
    await openFromNotification(windows, { url: '/week/' }, ORIGIN);
    expect(windows.matchAll).toHaveBeenCalledWith({ type: 'window' });
    expect(appWindow.focus).toHaveBeenCalled();
    expect(appWindow.navigate).toHaveBeenCalledWith(`${ORIGIN}/week/`);
    expect(windows.openWindow).not.toHaveBeenCalled();
  });

  it('opens Today in a new window when the app is closed', async () => {
    const windows = windowsWith([]);
    await openFromNotification(windows, undefined, ORIGIN);
    expect(windows.openWindow).toHaveBeenCalledWith(`${ORIGIN}/today/`);
  });

  it('opens a new window when the open one cannot be moved', async () => {
    const stuckWindow: AppWindow = {
      focus: vi.fn(() => Promise.resolve()),
      navigate: vi.fn(() => Promise.reject(new TypeError('Not controlled by this worker'))),
    };
    const windows = windowsWith([stuckWindow]);
    await openFromNotification(windows, { url: '/today/' }, ORIGIN);
    expect(windows.openWindow).toHaveBeenCalledWith(`${ORIGIN}/today/`);
  });

  it('never opens a page outside the app', async () => {
    const windows = windowsWith([]);
    await openFromNotification(windows, { url: 'https://elsewhere.example/' }, ORIGIN);
    expect(windows.openWindow).toHaveBeenCalledWith(`${ORIGIN}/today/`);
  });
});
