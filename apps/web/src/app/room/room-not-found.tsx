'use client';

import type { ReactNode } from 'react';
import { BackLink, PageHeader } from '@/components/shell/page-header';
import { ButtonLink } from '@/components/ui/button';

export const BACK_HOME = <BackLink href="/home" label="Back to Home" />;

// Its own file, so Add a job can show it without loading Room's sheets.
export function RoomNotFound(): ReactNode {
  return (
    <>
      <PageHeader title="Room not found" leading={BACK_HOME} />
      <p role="alert" className="text-[1.0625rem]">
        That room isn’t in this home any more. It may have been removed.
      </p>
      <ButtonLink href="/home">See all rooms</ButtonLink>
    </>
  );
}
