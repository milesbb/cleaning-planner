'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '../account/account-screen';
import { Button } from '../ui/button';
import { PageHeader } from './page-header';

// The loading, failure and no-home states every signed-in screen shares.

export function ScreenLoading({ children }: { children: string }): ReactNode {
  return (
    <p role="status" className="py-10 text-center text-lg">
      {children}
    </p>
  );
}

interface ScreenProblemProps {
  title: string;
  message: string;
  retry: () => void;
}

export function ScreenProblem({ title, message, retry }: ScreenProblemProps): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} />
      <FormAlert>{message}</FormAlert>
      <Button onClick={retry}>Try again</Button>
    </div>
  );
}

// Someone with no home yet has nothing to see here: send them to start one.
export function useStartAHomeWhenHomeless(hasNoHome: boolean): void {
  const router = useRouter();
  useEffect(() => {
    if (hasNoHome) router.replace('/homes/new');
  }, [hasNoHome, router]);
}
