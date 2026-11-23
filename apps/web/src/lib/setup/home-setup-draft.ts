'use client';

import { weekdaySchema } from '@cleaning-planner/contracts/primitives';
import { homeFeatureSchema } from '@cleaning-planner/contracts/room';
import { z } from '@cleaning-planner/contracts/zod';
import { useMemo, useSyncExternalStore } from 'react';
import { tabValue } from '../storage/stored-value';
import { DEFAULT_HOME_SETUP } from './home-setup';
import type { HomeSetup } from './home-setup';

const roomCountSchema = z.int().check(z.minimum(0));

const homeSetupSchema = z.object({
  homeName: z.string(),
  roomCounts: z.object({
    kitchen: roomCountSchema,
    laundry: roomCountSchema,
    bathroom: roomCountSchema,
    bedroom: roomCountSchema,
    livingRoom: roomCountSchema,
    hallway: roomCountSchema,
    office: roomCountSchema,
    outdoor: roomCountSchema,
  }),
  features: z.array(homeFeatureSchema),
  weekStartsOn: weekdaySchema,
  reminderTime: z.enum(['morning', 'evening', 'none']),
});

const storedDraft = tabValue('cleaning-planner.home-setup');
const listeners = new Set<() => void>();
// Kept in memory too, so setup still works in a tab where storage is blocked.
let draftInMemory: string | null = null;

function saveDraft(draft: string | null): void {
  draftInMemory = draft;
  if (draft === null) storedDraft.forget();
  else storedDraft.remember(draft);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function currentDraft(): string | null {
  return draftInMemory ?? storedDraft.read();
}

function parseDraft(draft: string | null): HomeSetup {
  if (draft === null) return DEFAULT_HOME_SETUP;
  try {
    const parsed = homeSetupSchema.safeParse(JSON.parse(draft));
    return parsed.success ? parsed.data : DEFAULT_HOME_SETUP;
  } catch {
    return DEFAULT_HOME_SETUP;
  }
}

export interface HomeSetupDraft {
  setup: HomeSetup;
  change: (changes: Partial<HomeSetup>) => void;
}

// The choices made on the three setup screens, kept for this tab until the
// home is created.
export function useHomeSetup(): HomeSetupDraft {
  const draft = useSyncExternalStore(subscribe, currentDraft, () => null);
  const setup = useMemo(() => parseDraft(draft), [draft]);
  return {
    setup,
    change: (changes): void => {
      saveDraft(JSON.stringify({ ...parseDraft(currentDraft()), ...changes }));
    },
  };
}

export function forgetHomeSetup(): void {
  saveDraft(null);
}
