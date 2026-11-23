'use client';

import { useSyncExternalStore } from 'react';

// Chrome and Edge offer to install once, as the page loads, long before
// Settings opens; the offer is kept here until someone taps Install.

interface InstallOffer {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let waitingOffer: InstallOffer | null = null;
const subscribers = new Set<() => void>();

function setOffer(offer: InstallOffer | null): void {
  waitingOffer = offer;
  for (const notify of subscribers) notify();
}

function isInstallOffer(event: Event): event is Event & InstallOffer {
  return 'prompt' in event && typeof event.prompt === 'function' && 'userChoice' in event;
}

export function listenForInstallPrompt(target: Window): () => void {
  const keepOffer = (event: Event): void => {
    if (!isInstallOffer(event)) return;
    event.preventDefault();
    setOffer(event);
  };
  const forgetOffer = (): void => {
    setOffer(null);
  };
  target.addEventListener('beforeinstallprompt', keepOffer);
  target.addEventListener('appinstalled', forgetOffer);
  return () => {
    target.removeEventListener('beforeinstallprompt', keepOffer);
    target.removeEventListener('appinstalled', forgetOffer);
  };
}

function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
}

const hasOffer = (): boolean => waitingOffer !== null;
const NO_OFFER_ON_THE_SERVER = (): boolean => false;

export interface InstallPrompt {
  canPrompt: boolean;
  // True when the person chose to install. An offer can only be used once.
  install: () => Promise<boolean>;
}

async function install(): Promise<boolean> {
  const offer = waitingOffer;
  if (offer === null) return false;
  setOffer(null);
  await offer.prompt();
  return (await offer.userChoice).outcome === 'accepted';
}

export function useInstallPrompt(): InstallPrompt {
  const canPrompt = useSyncExternalStore(subscribe, hasOffer, NO_OFFER_ON_THE_SERVER);
  return { canPrompt, install };
}
