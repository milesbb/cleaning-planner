'use client';

import type { HouseholdSummary, Member } from '@cleaning-planner/contracts/household';
import type { Profile } from '@cleaning-planner/contracts/profile';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/shell/page-header';
import { ScreenLoading, ScreenProblem } from '@/components/shell/screen-states';
import { useMe, useMembers } from '@/lib/home/home-queries';
import { useCurrentHome } from '@/lib/home/use-current-home';
import { InstallAppSection } from './install-app-section';
import { HomePeopleSection, SignOutButton, YouSection } from './settings-sections';

interface CurrentHomePeople {
  home: HouseholdSummary;
  members: readonly Member[];
}

type SettingsState =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string; retry: () => void }
  | { kind: 'ready'; profile: Profile; homePeople: CurrentHomePeople | null };

function isWaiting(query: UseQueryResult, isNeeded: boolean): boolean {
  return isNeeded && query.data === undefined;
}

function useSettings(): SettingsState {
  const me = useMe();
  const current = useCurrentHome();
  const members = useMembers(current.home?.id ?? null);
  const failed = [me, current.homes, members].find((query) => query.isError);
  if (failed !== undefined) {
    return { kind: 'failed', message: failed.error.message, retry: () => void failed.refetch() };
  }
  if (me.data === undefined || current.homes.data === undefined) return { kind: 'loading' };
  if (isWaiting(members, current.home !== null)) return { kind: 'loading' };
  const homePeople =
    current.home === null || members.data === undefined
      ? null
      : { home: current.home, members: members.data };
  return { kind: 'ready', profile: me.data, homePeople };
}

export function SettingsScreen(): ReactNode {
  const settings = useSettings();
  return (
    <AppShell activeTab="settings">
      {settings.kind === 'loading' && <ScreenLoading>Getting your settings…</ScreenLoading>}
      {settings.kind === 'failed' && (
        <ScreenProblem title="Settings" message={settings.message} retry={settings.retry} />
      )}
      {settings.kind === 'ready' && (
        <>
          <PageHeader title="Settings" />
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
            <YouSection profile={settings.profile} />
            {settings.homePeople === null ? null : (
              <HomePeopleSection
                home={settings.homePeople.home}
                members={settings.homePeople.members}
                myUserId={settings.profile.id}
              />
            )}
          </div>
          <InstallAppSection />
          <SignOutButton />
        </>
      )}
    </AppShell>
  );
}
