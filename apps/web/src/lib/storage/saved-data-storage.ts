import type { UseStore } from 'idb-keyval';

const DATABASE_NAME = 'cleaning-planner';
const STORE_NAME = 'saved-data';

export interface SavedDataStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

async function ignoringBlockedStorage(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch {
    // IndexedDB blocked (private browsing, cleared site data): the app just starts without saved data.
  }
}

type IdbKeyval = typeof import('idb-keyval');

// Larger saved data (the last answers from the API) in IndexedDB, which unlike
// local storage doesn't block the page while it writes. idb-keyval loads on
// first use, keeping it out of every page's first load.
export function savedDataStorage(): SavedDataStorage {
  let opened: Promise<{ idb: IdbKeyval; store: UseStore }> | undefined;
  const open = (): Promise<{ idb: IdbKeyval; store: UseStore }> => {
    opened ??= import('idb-keyval').then((idb) => ({
      idb,
      store: idb.createStore(DATABASE_NAME, STORE_NAME),
    }));
    return opened;
  };
  return {
    getItem: async (key): Promise<string | null> => {
      try {
        const { idb, store } = await open();
        const value: unknown = await idb.get(key, store);
        return typeof value === 'string' ? value : null;
      } catch {
        return null;
      }
    },
    setItem: (key, value) =>
      ignoringBlockedStorage(async () => {
        const { idb, store } = await open();
        await idb.set(key, value, store);
      }),
    removeItem: (key) =>
      ignoringBlockedStorage(async () => {
        const { idb, store } = await open();
        await idb.del(key, store);
      }),
  };
}

// Saved answers belong to whoever was signed in. Once the device holds no
// session (signed out, or the session ended), they are thrown away unread.
export function onlyWhileSignedIn(
  storage: SavedDataStorage,
  hasStoredSession: () => boolean,
): SavedDataStorage {
  return {
    ...storage,
    getItem: async (key): Promise<string | null> => {
      if (hasStoredSession()) return storage.getItem(key);
      await storage.removeItem(key);
      return null;
    },
  };
}
