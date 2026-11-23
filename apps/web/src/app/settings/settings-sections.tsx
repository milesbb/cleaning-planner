'use client';

import type { HouseholdSummary, Member } from '@cleaning-planner/contracts/household';
import type { Profile } from '@cleaning-planner/contracts/profile';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/ui/section-heading';
import { ProfileSheet } from './profile-sheet';
import { useSignOut } from './use-settings-actions';

function SettingsSection({ title, children }: { title: string; children: ReactNode }): ReactNode {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <SectionHeading id={headingId}>{title}</SectionHeading>
      {children}
    </section>
  );
}

export function YouSection({ profile }: { profile: Profile }): ReactNode {
  return (
    <SettingsSection title="You">
      <Card raised={false} className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={profile.name} colour={profile.colour} size="large" />
          <div className="flex min-w-0 flex-col">
            <p className="text-lg font-bold break-words">{profile.name}</p>
            <p className="break-all">{profile.email}</p>
          </div>
        </div>
        <ProfileSheet profile={profile} />
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
      <Card raised={false}>
        <ul className="flex flex-col gap-3">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center gap-3">
              <Avatar name={member.name} colour={member.colour} />
              <span className="font-bold break-words">
                {member.userId === myUserId ? `${member.name} (you)` : member.name}
              </span>
              {member.role === 'owner' ? <Badge tone="owner">Owner</Badge> : null}
            </li>
          ))}
        </ul>
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
