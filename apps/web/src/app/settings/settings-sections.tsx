'use client';

import type { HouseholdSummary, Member } from '@cleaning-planner/contracts/household';
import type { Profile } from '@cleaning-planner/contracts/profile';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { Avatar } from '@/components/ui/avatar';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/ui/section-heading';
import { PeopleList } from './people-list';
import { useSignOut } from './use-settings-actions';

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactNode {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <SectionHeading id={headingId}>{title}</SectionHeading>
      {children}
    </section>
  );
}

// docs/LAYOUTS.md §4.9: two columns from 768px, aligned to the top.
export function SettingsColumns({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start">{children}</div>
  );
}

export function FormColumn({ children }: { children: ReactNode }): ReactNode {
  return <div className="flex w-full max-w-lg flex-col gap-4">{children}</div>;
}

export function ProfileSummary({ profile }: { profile: Profile }): ReactNode {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={profile.name} colour={profile.colour} size="large" />
      <div className="flex min-w-0 flex-col">
        <p className="text-lg font-bold break-words">{profile.name}</p>
        <p className="break-all">{profile.email}</p>
      </div>
    </div>
  );
}

export function YouSection({ profile }: { profile: Profile }): ReactNode {
  return (
    <SettingsSection title="You">
      <Card raised={false} className="flex flex-col gap-4">
        <ProfileSummary profile={profile} />
        <ButtonLink href="/settings/account" variant="secondary">
          Your account
        </ButtonLink>
      </Card>
    </SettingsSection>
  );
}

interface HomePeopleProps {
  home: HouseholdSummary;
  members: readonly Member[];
  myUserId: string;
}

export function HomePeopleSection({ home, members, myUserId }: HomePeopleProps): ReactNode {
  return (
    <SettingsSection title={home.name}>
      <Card raised={false} className="flex flex-col gap-4">
        <PeopleList members={members} myUserId={myUserId} />
        <ButtonLink href="/settings/home" variant="secondary">
          Home settings
        </ButtonLink>
      </Card>
    </SettingsSection>
  );
}

export function SignOutButton(): ReactNode {
  const signOut = useSignOut();
  return (
    <div className="flex flex-col gap-3">
      {signOut.error === null ? null : <FormAlert>{signOut.error.message}</FormAlert>}
      <Button
        variant="secondary"
        disabled={signOut.isPending}
        onClick={() => {
          signOut.mutate();
        }}
      >
        {signOut.isPending ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );
}
