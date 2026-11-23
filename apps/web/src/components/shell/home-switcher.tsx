'use client';

import { lazy, Suspense, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDownIcon, HomeIcon } from '../icons/interface-icons';

interface Home {
  id: string;
  name: string;
}

export interface HomeSwitcherProps {
  homes: readonly Home[];
  currentHomeId: string;
  onSwitch: (homeId: string) => void;
}

const HomeSwitcherSheet = lazy(async () => ({
  default: (await import('./home-switcher-sheet')).HomeSwitcherSheet,
}));

export function HomeSwitcher(props: HomeSwitcherProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const switchButton = useRef<HTMLButtonElement>(null);
  const currentHome = props.homes.find((home) => home.id === props.currentHomeId);
  const currentName = currentHome?.name ?? 'Your home';
  return (
    <>
      <button
        ref={switchButton}
        type="button"
        aria-label={`${currentName}, switch home`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => {
          setHasOpened(true);
          setIsOpen(true);
        }}
        className="flex min-h-11 max-w-full items-center gap-1.5 rounded-full border-2 border-ink bg-card px-3 font-bold text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <HomeIcon size={20} strokeWidth={2.2} />
        <span className="truncate">{currentName}</span>
        <ChevronDownIcon size={18} strokeWidth={2.6} />
      </button>
      {hasOpened ? (
        <Suspense fallback={null}>
          <HomeSwitcherSheet
            {...props}
            open={isOpen}
            onOpenChange={setIsOpen}
            switchButton={switchButton}
          />
        </Suspense>
      ) : null}
    </>
  );
}
