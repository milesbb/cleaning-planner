import { afterEach, describe, expect, it, vi } from 'vitest';
import { onlyWhileSignedIn, savedDataStorage } from './saved-data-storage';

const { idbStore } = vi.hoisted(() => ({ idbStore: new Map<string, string>() }));

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'cleaning-planner-store'),
  get: vi.fn((key: string) => Promise.resolve(idbStore.get(key))),
  set: vi.fn((key: string, value: string) => {
    idbStore.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    idbStore.delete(key);
    return Promise.resolve();
  }),
}));

const idbKeyval = await import('idb-keyval');

afterEach(() => {
  idbStore.clear();
  vi.mocked(idbKeyval.get).mockClear();
});

describe('savedDataStorage', () => {
  it('saves, reads back and removes a value in IndexedDB', async () => {
    const storage = savedDataStorage();
    await storage.setItem('cache', '{"queries":[]}');
    await expect(storage.getItem('cache')).resolves.toBe('{"queries":[]}');
    await storage.removeItem('cache');
    await expect(storage.getItem('cache')).resolves.toBeNull();
  });

  it('reads nothing when nothing was saved', async () => {
    await expect(savedDataStorage().getItem('cache')).resolves.toBeNull();
  });

  it('acts as if nothing was saved when the browser blocks IndexedDB', async () => {
    vi.mocked(idbKeyval.get).mockRejectedValueOnce(new DOMException('Blocked', 'SecurityError'));
    vi.mocked(idbKeyval.set).mockRejectedValueOnce(new DOMException('Blocked', 'SecurityError'));
    vi.mocked(idbKeyval.del).mockRejectedValueOnce(new DOMException('Blocked', 'SecurityError'));
    const storage = savedDataStorage();
    await expect(storage.setItem('cache', 'value')).resolves.toBeUndefined();
    await expect(storage.getItem('cache')).resolves.toBeNull();
    await expect(storage.removeItem('cache')).resolves.toBeUndefined();
  });
});

describe('onlyWhileSignedIn', () => {
  it('reads saved data while someone is signed in on this device', async () => {
    const storage = onlyWhileSignedIn(savedDataStorage(), () => true);
    await storage.setItem('cache', 'Sam’s homes');
    await expect(storage.getItem('cache')).resolves.toBe('Sam’s homes');
  });

  it('throws saved data away once nobody is signed in, so the next person never sees it', async () => {
    let isSignedIn = true;
    const storage = onlyWhileSignedIn(savedDataStorage(), () => isSignedIn);
    await storage.setItem('cache', 'Sam’s homes');
    isSignedIn = false;
    await expect(storage.getItem('cache')).resolves.toBeNull();
    isSignedIn = true;
    await expect(storage.getItem('cache')).resolves.toBeNull();
  });
});
