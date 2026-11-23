'use client';

import type { ReactNode } from 'react';
import { useIsLaptop } from './use-is-laptop';

interface TwoColumnsProps {
  main: ReactNode;
  side: ReactNode;
  sideLabel: string;
  sideBelowLaptop?: 'stacked' | 'hidden';
}

// docs/LAYOUTS.md §2.4. The side column keeps a little padding inside its own
// scroll area so focus outlines on its edges aren't clipped.
const COLUMNS_CLASSES =
  'flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-10';

const SIDE_CLASSES =
  'flex min-w-0 flex-col gap-4 lg:sticky lg:top-8 lg:-m-1.5 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:p-1.5';

export function TwoColumns({
  main,
  side,
  sideLabel,
  sideBelowLaptop = 'stacked',
}: TwoColumnsProps): ReactNode {
  const isLaptop = useIsLaptop();
  const showsSide = isLaptop || sideBelowLaptop === 'stacked';
  return (
    <div className={COLUMNS_CLASSES}>
      <div className="flex min-w-0 flex-col gap-4">{main}</div>
      {showsSide ? (
        <section aria-label={sideLabel} className={SIDE_CLASSES}>
          {side}
        </section>
      ) : null}
    </div>
  );
}
