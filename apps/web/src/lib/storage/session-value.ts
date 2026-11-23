// Small values carried from one screen to the next in this tab only (never in
// a URL). When the browser blocks storage the value is simply missing, and the
// screen that needs it asks again.
export interface SessionValue {
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

export function sessionValue(key: string): SessionValue {
  return {
    remember: (value): void => {
      ignoringBlockedStorage(() => {
        window.sessionStorage.setItem(key, value);
      });
    },
    read: (): string | null => {
      try {
        return window.sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    forget: (): void => {
      ignoringBlockedStorage(() => {
        window.sessionStorage.removeItem(key);
      });
    },
  };
}
