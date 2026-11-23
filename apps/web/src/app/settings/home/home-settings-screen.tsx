'use client';

import type { Household, Member } from '@cleaning-planner/contracts/household';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { BackLink, PageHeader } from '@/components/shell/page-header';
import {
  ScreenLoading,
  ScreenProblem,
  useStartAHomeWhenHomeless,
} from '@/components/shell/screen-states';
import { Card } from '@/components/ui/card';
import { useHousehold, useMe, useMembers } from '@/lib/home/home-queries';
import { useCurrentHome } from '@/lib/home/use-current-home';
import { countOf } from '@/lib/rooms';
import { PeopleList } from '../people-list';
import { InviteCard } from './invite-card';
import { LeaveHomeSheet } from './leave-home-sheet';

interface ReadyHome {
  kind: 'ready';
  household: Household;
  members: readonly Member[];
  myUserId: string;
}

type HomeSettingsState =
  | { kind: 'loading' }
  | { kind: 'noHome' }
  | { kind: 'failed'; message: string; retry: () => void }
  | ReadyHome;

function useHomeSettings(): HomeSettingsState {
  const current = useCurrentHome();
  const householdId = current.home?.id ?? null;
  const me = useMe();
  const household = useHousehold(householdId);
  const members = useMembers(householdId);
  const failed = [current.homes, me, household, members].find((query) => query.isError);
  if (failed !== undefined) {
    return { kind: 'failed', message: failed.error.message, retry: () => void failed.refetch() };
  }
  if (current.homes.data?.length === 0) return { kind: 'noHome' };
  if (me.data === undefined || household.data === undefined || members.data === undefined) {
    return { kind: 'loading' };
  }
  return {
    kind: 'ready',
    household: household.data,
    members: members.data,
    myUserId: me.data.id,
  };
}

function HomeSettingsContent({ home }: { home: ReadyHome }): ReactNode {
  const { household } = home;
  return (
    <>
      <PageHeader
        title={household.name}
        subtitle={countOf(home.members.length, 'person', 'people')}
        leading={<BackLink href="/settings" label="Back to Settings" />}
      />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        <Card raised={false}>
          <PeopleList members={home.members} myUserId={home.myUserId} />
        </Card>
        <InviteCard
          householdId={household.id}
          homeName={household.name}
          timeZone={household.timeZone}
        />
      </div>
      {household.ownerId === home.myUserId ? (
        <p>You own this home. To leave, make someone else the owner first.</p>
      ) : (
        <LeaveHomeSheet householdId={household.id} homeName={household.name} />
      )}
    </>
  );
}

export function HomeSettingsScreen(): ReactNode {
  const home = useHomeSettings();
  useStartAHomeWhenHomeless(home.kind === 'noHome');
  return (
    <AppShell activeTab="settings">
      {home.kind === 'ready' && <HomeSettingsContent home={home} />}
      {home.kind === 'failed' && (
        <ScreenProblem title="Home settings" message={home.message} retry={home.retry} />
      )}
      {(home.kind === 'loading' || home.kind === 'noHome') && (
        <ScreenLoading>Getting your home…</ScreenLoading>
      )}
    </AppShell>
  );
}
