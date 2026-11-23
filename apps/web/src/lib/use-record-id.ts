'use client';

import { useSyncExternalStore } from 'react';
import { readRecordId } from './record-id';

const NEVER_CHANGES = (): (() => void) => () => undefined;

function recordIdInAddress(): string | null {
  return readRecordId(new URLSearchParams(window.location.search));
}

// The record's id from `?id=`: undefined until the browser has read the
// address, null when it's missing or malformed.
export function useRecordId(): string | null | undefined {
  return useSyncExternalStore(NEVER_CHANGES, recordIdInAddress, () => undefined);
}
