'use client';

import type { CreateInviteResponse } from '@cleaning-planner/contracts/invite';
import { calendarDateInTimeZone } from '@cleaning-planner/schedule/time-zone';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert, FormStatus } from '@/components/account/account-screen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/ui/section-heading';
import { TextField } from '@/components/ui/text-field';
import { formatShortDate } from '@/lib/format-date';
import { groupedInviteCode, inviteLinkFor, inviteMessageFor } from '@/lib/invites/invite-link';
import { useCreateInvite } from './use-home-settings-actions';

interface InviteCardProps {
  householdId: string;
  homeName: string;
  timeZone: string;
}

const COPY_FAILED = 'Couldn’t copy. Select the link and copy it yourself.';

function canShare(): boolean {
  return typeof navigator.share === 'function';
}

interface InviteDetailsProps {
  invite: CreateInviteResponse;
  homeName: string;
  timeZone: string;
}

function InviteDetails({ invite, homeName, timeZone }: InviteDetailsProps): ReactNode {
  const [copyResult, setCopyResult] = useState<string | null>(null);
  const link = inviteLinkFor(window.location.origin, invite.code);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(link);
      setCopyResult('Link copied');
    } catch {
      setCopyResult(COPY_FAILED);
    }
  };
  const share = (): void => {
    const message = { title: `Join ${homeName}`, text: inviteMessageFor(homeName, invite.code) };
    void navigator.share({ ...message, url: link }).catch(() => undefined);
  };
  return (
    <>
      <p className="font-display text-4xl font-extrabold tracking-[0.1em]">
        {groupedInviteCode(invite.code)}
      </p>
      <p>Works until {formatShortDate(calendarDateInTimeZone(invite.expiresAt, timeZone))}.</p>
      <TextField label="Invite link" value={link} readOnly />
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" onClick={() => void copy()}>
          Copy link
        </Button>
        {canShare() ? <Button onClick={share}>Share</Button> : null}
      </div>
      {copyResult === null ? null : <FormStatus>{copyResult}</FormStatus>}
    </>
  );
}

export function InviteCard({ householdId, homeName, timeZone }: InviteCardProps): ReactNode {
  const headingId = useId();
  const createInvite = useCreateInvite(householdId);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <SectionHeading id={headingId}>Invite someone</SectionHeading>
      <Card raised={false} className="flex flex-col gap-4">
        <p>Anyone with the code can join this home for the next 7 days.</p>
        {createInvite.data === undefined ? null : (
          <InviteDetails invite={createInvite.data} homeName={homeName} timeZone={timeZone} />
        )}
        {createInvite.error === null ? null : <FormAlert>{createInvite.error.message}</FormAlert>}
        <Button
          variant={createInvite.data === undefined ? 'primary' : 'dashed'}
          disabled={createInvite.isPending}
          onClick={() => {
            createInvite.mutate();
          }}
        >
          {createInvite.data === undefined ? 'Get an invite code' : 'Get a new code'}
        </Button>
      </Card>
    </section>
  );
}
