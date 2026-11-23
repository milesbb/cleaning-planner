'use client';

import { inviteCodeSchema } from '@cleaning-planner/contracts/invite';
import { useSyncExternalStore } from 'react';

const NEVER_CHANGES = (): (() => void) => () => undefined;

function inviteCodeInAddress(): string | null {
  const parsed = inviteCodeSchema.safeParse(
    new URLSearchParams(window.location.search).get('code'),
  );
  return parsed.success ? parsed.data : null;
}

// The invite code from `?code=`: undefined until the browser has read the
// address (a static page can't know it), null when it's missing or malformed.
export function useInviteCode(): string | null | undefined {
  return useSyncExternalStore(NEVER_CHANGES, inviteCodeInAddress, () => undefined);
}
