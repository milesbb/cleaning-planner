'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronDownIcon, HomeIcon, PlusIcon } from '../icons/interface-icons';
import { ButtonLink } from '../ui/button';
import { BottomSheet } from './bottom-sheet';

interface Home {
  id: string;
  name: string;
}

interface HomeSwitcherProps {
  homes: readonly Home[];
  currentHomeId: string;
  onSwitch: (homeId: string) => void;
}

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

export function HomeSwitcher(props: HomeSwitcherProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const currentHome = props.homes.find((home) => home.id === props.currentHomeId);
  const currentName = currentHome?.name ?? 'Your home';
  const trigger = (
    <button
      type="button"
      aria-label={`${currentName}, switch home`}
      className="flex min-h-11 max-w-full items-center gap-1.5 rounded-full border-2 border-ink bg-card px-3 font-bold text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <HomeIcon size={20} strokeWidth={2.2} />
      <span className="truncate">{currentName}</span>
      <ChevronDownIcon size={18} strokeWidth={2.6} />
    </button>
  );
  return (
    <BottomSheet title="Your homes" open={isOpen} onOpenChange={setIsOpen} trigger={trigger}>
      <HomeList
        {...props}
        onChosen={() => {
          setIsOpen(false);
        }}
      />
      <ButtonLink href="/homes/new" variant="dashed">
        <PlusIcon />
        Start or join a home
      </ButtonLink>
    </BottomSheet>
  );
}
