import type { SavedDataStorage } from '@/lib/storage/saved-data-storage';

// Saved data kept in memory, standing in for IndexedDB, so a test can close and
// reopen the app on the same "device".
export interface MemoryStorage extends SavedDataStorage {
  savedText: () => string;
}

export function memoryStorage(): MemoryStorage {
  const saved = new Map<string, string>();
  return {
    savedText: (): string => [...saved.values()].join(''),
    getItem: (key): Promise<string | null> => Promise.resolve(saved.get(key) ?? null),
    setItem: (key, value): Promise<void> => {
      saved.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key): Promise<void> => {
      saved.delete(key);
      return Promise.resolve();
    },
  };
}
