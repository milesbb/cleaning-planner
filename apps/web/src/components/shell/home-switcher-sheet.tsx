'use client';

import type { ReactNode, RefObject } from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon, PlusIcon } from '../icons/interface-icons';
import { ButtonLink } from '../ui/button';
import { BottomSheet } from './bottom-sheet';
import type { HomeSwitcherProps } from './home-switcher';

// The Your homes sheet, loaded the first time the switcher opens so the
// dialog code isn't part of any page's first load.

const HOME_OPTION_CLASSES =
  'flex min-h-14 w-full items-center justify-between gap-3 rounded-control border-2 border-ink bg-card px-4 text-left text-lg font-bold text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';

interface HomeListProps extends HomeSwitcherProps {
  onChosen: () => void;
}

function HomeList({ homes, currentHomeId, onSwitch, onChosen }: HomeListProps): ReactNode {
  return (
    <ul className="flex flex-col gap-2">
      {homes.map((home) => {
        const isCurrent = home.id === currentHomeId;
        return (
          <li key={home.id}>
            <button
              type="button"
              aria-current={isCurrent ? 'true' : undefined}
              onClick={() => {
                onSwitch(home.id);
                onChosen();
              }}
              className={cn(HOME_OPTION_CLASSES, { 'bg-kitchen': isCurrent })}
            >
              {home.name}
              {isCurrent ? <CheckIcon strokeWidth={3} /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface HomeSwitcherSheetProps extends HomeSwitcherProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  switchButton: RefObject<HTMLButtonElement | null>;
}

export function HomeSwitcherSheet({
  open,
  onOpenChange,
  switchButton,
  ...props
}: HomeSwitcherSheetProps): ReactNode {
  return (
    <BottomSheet
      title="Your homes"
      open={open}
      onOpenChange={onOpenChange}
      returnFocusTo={switchButton}
    >
      <HomeList
        {...props}
        onChosen={() => {
          onOpenChange(false);
        }}
      />
      <ButtonLink href="/homes/new" variant="dashed">
        <PlusIcon />
        Start or join a home
      </ButtonLink>
    </BottomSheet>
  );
}
