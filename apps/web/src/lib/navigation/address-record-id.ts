'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { readRecordId } from '../record-id';

// Fired after this app changes the address itself; the browser only fires
// `popstate` for Back and Forward.
const ADDRESS_CHANGED = 'cleaning-planner:address-changed';

function subscribeToAddress(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(ADDRESS_CHANGED, onChange);
  return (): void => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(ADDRESS_CHANGED, onChange);
  };
}

function noIdWhilePrerendering(): null {
  return null;
}

// A record id in the address under `name` (`?job=…`), following changes.
export function useAddressRecordId(name: string): string | null {
  const readNow = useCallback(
    (): string | null => readRecordId(new URLSearchParams(window.location.search), name),
    [name],
  );
  return useSyncExternalStore(subscribeToAddress, readNow, noIdWhilePrerendering);
}

// Sets or clears `?name=` without leaving the page. Next.js keeps its router in
// step with the browser's own `pushState` and `replaceState`.
export function changeAddressRecordId(
  name: string,
  recordId: string | null,
  how: 'push' | 'replace',
): void {
  const address = new URL(window.location.href);
  if (recordId === null) address.searchParams.delete(name);
  else address.searchParams.set(name, recordId);
  const relativeAddress = `${address.pathname}${address.search}${address.hash}`;
  if (how === 'push') window.history.pushState(null, '', relativeAddress);
  else window.history.replaceState(null, '', relativeAddress);
  window.dispatchEvent(new Event(ADDRESS_CHANGED));
}
