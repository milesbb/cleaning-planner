import type {
  PersistedClient,
  Persister,
  PersistQueryClientProviderProps,
} from '@tanstack/react-query-persist-client';
import type { SavedDataStorage } from '@/lib/storage/saved-data-storage';

const MILLISECONDS_PER_DAY = 86_400_000;
export const SAVED_FOR_MS = MILLISECONDS_PER_DAY;
const SAVED_ANSWERS_KEY = 'api-answers';
// Saved answers skip the response schemas, so a change to a response's shape must
// bump this to throw the old copies away.
const SAVED_ANSWERS_VERSION = '1';

type SavedAnswersOptions = PersistQueryClientProviderProps['persistOptions'];

export interface SavedAnswers {
  persistOptions: SavedAnswersOptions;
  forget: () => void;
}

// The persister loads on first use, keeping it out of every page's first load.
function lazyPersister(storage: SavedDataStorage): Persister {
  let loaded: Promise<Persister> | undefined;
  const load = (): Promise<Persister> => {
    loaded ??= import('@tanstack/query-async-storage-persister').then(
      ({ createAsyncStoragePersister }) =>
        createAsyncStoragePersister({ storage, key: SAVED_ANSWERS_KEY }),
    );
    return loaded;
  };
  return {
    persistClient: async (client): Promise<void> => {
      await (await load()).persistClient(client);
    },
    restoreClient: async (): Promise<PersistedClient | undefined> => (await load()).restoreClient(),
    removeClient: async (): Promise<void> => {
      await (await load()).removeClient();
    },
  };
}

// `forget` deletes the saved copy and stops saving until the app next opens, so
// whoever signs in next never gets the answers of whoever was signed in before.
export function savedAnswers(storage: SavedDataStorage): SavedAnswers {
  let isForgotten = false;
  const storageUntilForgotten: SavedDataStorage = {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => (isForgotten ? Promise.resolve() : storage.setItem(key, value)),
    removeItem: (key) => storage.removeItem(key),
  };
  return {
    persistOptions: {
      persister: lazyPersister(storageUntilForgotten),
      maxAge: SAVED_FOR_MS,
      buster: SAVED_ANSWERS_VERSION,
    },
    forget: (): void => {
      isForgotten = true;
      void storage.removeItem(SAVED_ANSWERS_KEY);
    },
  };
}
