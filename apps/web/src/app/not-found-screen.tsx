'use client';

import type { ReactNode } from 'react';
import { useMightBeSignedIn } from '@/components/start/use-might-be-signed-in';
import { ButtonLink } from '@/components/ui/button';

// Any address that isn't a page: calm, with one way back.
export function NotFoundScreen(): ReactNode {
  const mightBeSignedIn = useMightBeSignedIn();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-6 py-10">
      <h1 className="font-display text-[2.375rem] leading-[2.625rem] font-extrabold tracking-tight">
        We couldn’t find that page
      </h1>
      <p className="text-[1.0625rem]">The link may be old or mistyped. Nothing has been lost.</p>
      {mightBeSignedIn ? (
        <ButtonLink href="/today">Go to Today</ButtonLink>
      ) : (
        <ButtonLink href="/welcome">Go to the start</ButtonLink>
      )}
    </main>
  );
}
