// Small values kept in the browser, never in a URL. When the browser blocks
// storage the value is simply missing, and whatever needs it asks again.
export interface StoredValue {
  remember: (value: string) => void;
  read: () => string | null;
  forget: () => void;
}

function ignoringBlockedStorage(action: () => void): void {
  try {
    action();
  } catch {
    // Storage blocked: the value is missing, which every caller handles.
  }
}

function storedValue(storage: () => Storage, key: string): StoredValue {
  return {
    remember: (value): void => {
      ignoringBlockedStorage(() => {
        storage().setItem(key, value);
      });
    },
    read: (): string | null => {
      try {
        return storage().getItem(key);
      } catch {
        return null;
      }
    },
    forget: (): void => {
      ignoringBlockedStorage(() => {
        storage().removeItem(key);
      });
    },
  };
}

// Carried from one screen to the next in this tab only.
export function tabValue(key: string): StoredValue {
  return storedValue(() => window.sessionStorage, key);
}

// Kept on this device until forgotten.
export function deviceValue(key: string): StoredValue {
  return storedValue(() => window.localStorage, key);
}
