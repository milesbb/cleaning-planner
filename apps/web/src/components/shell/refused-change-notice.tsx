'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useRefusedChange } from '@/lib/api/refused-change';

export function RefusedChangeNotice(): ReactNode {
  const { message, dismiss } = useRefusedChange();
  if (message === null) return null;
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-card border-2 border-ink bg-card px-4 py-3 text-ink sm:flex-row sm:items-center sm:justify-between"
    >
      <p>{message}</p>
      <Button variant="secondary" onClick={dismiss}>
        OK
      </Button>
    </div>
  );
}
