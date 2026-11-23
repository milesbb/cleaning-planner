'use client';

import type { HouseholdSummary } from '@cleaning-planner/contracts/household';
import type { ReactNode } from 'react';
import { CheckIcon, PlusIcon } from '@/components/icons/interface-icons';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SettingsSection } from '../settings-sections';

const HOME_CHOICE_CLASSES =
  'flex min-h-14 w-full items-center justify-between gap-3 rounded-control border-2 border-ink bg-card px-4 py-2 text-left text-lg font-bold text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';

interface YourHomesProps {
  homes: readonly HouseholdSummary[];
  currentHomeId: string | null;
  onOpenHome: (householdId: string) => void;
}

function HomeChoice({
  home,
  isCurrent,
  onOpen,
}: {
  home: HouseholdSummary;
  isCurrent: boolean;
  onOpen: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      aria-current={isCurrent ? 'true' : undefined}
      onClick={onOpen}
      className={cn(HOME_CHOICE_CLASSES, { 'bg-kitchen': isCurrent })}
    >
      <span className="min-w-0 break-words">{home.name}</span>
      <span className="flex shrink-0 items-center gap-2">
        {home.role === 'owner' ? <Badge tone="owner">Owner</Badge> : null}
        {isCurrent ? <CheckIcon strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

export function YourHomesSection({ homes, currentHomeId, onOpenHome }: YourHomesProps): ReactNode {
  return (
    <SettingsSection title="Your homes">
      {homes.length === 0 ? (
        <p>You’re not part of a home yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {homes.map((home) => (
            <li key={home.id}>
              <HomeChoice
                home={home}
                isCurrent={home.id === currentHomeId}
                onOpen={() => {
                  onOpenHome(home.id);
                }}
              />
            </li>
          ))}
        </ul>
      )}
      <ButtonLink href="/homes/new" variant="dashed">
        <PlusIcon />
        Start or join a home
      </ButtonLink>
    </SettingsSection>
  );
}
