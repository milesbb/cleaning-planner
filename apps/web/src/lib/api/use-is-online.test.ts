import { onlineManager } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startOfflineIfTheBrowserIs } from './use-is-online';

afterEach(() => {
  vi.restoreAllMocks();
  onlineManager.setOnline(true);
});

describe('startOfflineIfTheBrowserIs', () => {
  it('starts offline when the app opens without a connection, so waiting changes stay paused', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    startOfflineIfTheBrowserIs();
    expect(onlineManager.isOnline()).toBe(false);
  });

  it('stays online otherwise, because a browser saying it is online can be wrong', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    onlineManager.setOnline(true);
    startOfflineIfTheBrowserIs();
    expect(onlineManager.isOnline()).toBe(true);
  });
});
