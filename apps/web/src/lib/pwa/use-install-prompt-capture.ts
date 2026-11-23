'use client';

import { useEffect } from 'react';

// Loaded after start-up so the listener stays out of every page's first load;
// browsers offer to install after the page has loaded, so it's there in time.
export function useInstallPromptCapture(): void {
  useEffect(() => {
    let stopListening: (() => void) | null = null;
    let isUnmounted = false;
    const startListening = async (): Promise<void> => {
      const { listenForInstallPrompt } = await import('./install-prompt');
      if (!isUnmounted) stopListening = listenForInstallPrompt(window);
    };
    void startListening();
    return (): void => {
      isUnmounted = true;
      stopListening?.();
    };
  }, []);
}
