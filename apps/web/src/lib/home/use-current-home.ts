'use client';

import type { HouseholdSummary } from '@cleaning-planner/contracts/household';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { chooseCurrentHome, rememberCurrentHome, rememberedHomeId } from './current-home';
import { useHomes } from './home-queries';

export interface CurrentHome {
  homes: UseQueryResult<HouseholdSummary[]>;
  home: HouseholdSummary | null;
  switchHome: (householdId: string) => void;
}

export function useCurrentHome(): CurrentHome {
  const homes = useHomes();
  const [rememberedId, setRememberedId] = useState(rememberedHomeId);
  return {
    homes,
    home: chooseCurrentHome(homes.data ?? [], rememberedId),
    switchHome: (householdId): void => {
      rememberCurrentHome(householdId);
      setRememberedId(householdId);
    },
  };
}
