'use client';

import type { HouseholdSummary } from '@cleaning-planner/contracts/household';
import type { Profile } from '@cleaning-planner/contracts/profile';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { TEXT_ACTION_CLASSES } from '@/components/account/account-screen';
import { AppShell } from '@/components/shell/app-shell';
import { BackLink, PageHeader } from '@/components/shell/page-header';
import { ScreenLoading, ScreenProblem } from '@/components/shell/screen-states';
import { Card } from '@/components/ui/card';
import { useMe } from '@/lib/home/home-queries';
import { useCurrentHome } from '@/lib/home/use-current-home';
import { ProfileSheet } from '../profile-sheet';
import { ProfileSummary, SettingsSection, SignOutButton } from '../settings-sections';
import { YourHomesSection } from './your-homes-section';

type AccountState =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string; retry: () => void }
  | {
      kind: 'ready';
      profile: Profile;
      homes: HouseholdSummary[];
      currentHomeId: string | null;
      openHome: (householdId: string) => void;
    };

function useYourAccount(): AccountState {
  const me = useMe();
  const current = useCurrentHome();
  const router = useRouter();
  const failed = [me, current.homes].find((query) => query.isError);
  if (failed !== undefined) {
    return { kind: 'failed', message: failed.error.message, retry: () => void failed.refetch() };
  }
  if (me.data === undefined || current.homes.data === undefined) return { kind: 'loading' };
  return {
    kind: 'ready',
    profile: me.data,
    homes: current.homes.data,
    currentHomeId: current.home?.id ?? null,
    openHome: (householdId): void => {
      current.switchHome(householdId);
      router.push('/settings/home');
    },
  };
}

function YourDetailsSection({ profile }: { profile: Profile }): ReactNode {
  return (
    <SettingsSection title="Your details">
      <Card raised={false} className="flex flex-col gap-3">
        <ProfileSummary profile={profile} />
        <div className="flex flex-wrap gap-x-4">
          <ProfileSheet profile={profile} />
          <Link href="/settings/account/email" className={TEXT_ACTION_CLASSES}>
            Change email
          </Link>
          <Link href="/settings/account/password" className={TEXT_ACTION_CLASSES}>
            Change password
          </Link>
        </div>
      </Card>
    </SettingsSection>
  );
}

export function YourAccountScreen(): ReactNode {
  const account = useYourAccount();
  return (
    <AppShell activeTab="settings">
      {account.kind === 'loading' && <ScreenLoading>Getting your account…</ScreenLoading>}
      {account.kind === 'failed' && (
        <ScreenProblem title="Your account" message={account.message} retry={account.retry} />
      )}
      {account.kind === 'ready' && (
        <>
          <PageHeader
            title="Your account"
            leading={<BackLink href="/settings" label="Back to Settings" />}
          />
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
            <YourDetailsSection profile={account.profile} />
            <YourHomesSection
              homes={account.homes}
              currentHomeId={account.currentHomeId}
              onOpenHome={account.openHome}
            />
          </div>
          <SignOutButton />
        </>
      )}
    </AppShell>
  );
}
