'use client';

import type { ReactNode } from 'react';
import { useIsOnline } from '@/lib/api/use-is-online';

export function OfflineBanner(): ReactNode {
  const isOnline = useIsOnline();
  if (isOnline) return null;
  return (
    <p role="status" className="rounded-card border-2 border-ink bg-card px-4 py-3 text-ink">
      You’re offline. This is what was saved on this device.
    </p>
  );
}
