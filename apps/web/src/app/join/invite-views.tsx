'use client';

import type { InvitePreview } from '@cleaning-planner/contracts/invite';
import type { ReactNode } from 'react';
import { AccountHeading, FormAlert, TextButton } from '@/components/account/account-screen';
import { ArtFrame } from '@/components/art/art-frame';
import { Button, ButtonLink } from '@/components/ui/button';
import { countOf } from '@/lib/rooms';

function InviteActions({ children }: { children: ReactNode }): ReactNode {
  return <div className="mt-auto flex flex-col items-stretch gap-3.5 sm:mt-0">{children}</div>;
}

export function SignedOutInvite(): ReactNode {
  return (
    <>
      <ArtFrame artKey="doorOpening" alt="" />
      <AccountHeading title="You’re invited to a home">
        Create an account or log in, and we’ll bring you straight back here to join.
      </AccountHeading>
      <InviteActions>
        <ButtonLink href="/sign-up">Create an account</ButtonLink>
        <ButtonLink href="/sign-in" variant="secondary">
          Log in
        </ButtonLink>
      </InviteActions>
    </>
  );
}

interface InvitePreviewViewProps {
  preview: InvitePreview;
  isJoining: boolean;
  joinError: string | null;
  onJoin: () => void;
  onNotNow: () => void;
}

export function InvitePreviewView({
  preview,
  isJoining,
  joinError,
  onJoin,
  onNotNow,
}: InvitePreviewViewProps): ReactNode {
  return (
    <>
      <ArtFrame artKey="doorOpening" alt="" />
      <AccountHeading title={`Join ${preview.householdName}`}>
        {preview.invitedByName} invited you. {countOf(preview.memberCount, 'person', 'people')}{' '}
        {preview.memberCount === 1 ? 'lives' : 'live'} there now.
      </AccountHeading>
      <InviteActions>
        {joinError !== null && <FormAlert>{joinError}</FormAlert>}
        <Button onClick={onJoin} disabled={isJoining}>
          {isJoining ? 'Joining…' : `Join ${preview.householdName}`}
        </Button>
        <div className="flex justify-center">
          <TextButton onClick={onNotNow} disabled={isJoining}>
            Not now
          </TextButton>
        </div>
      </InviteActions>
    </>
  );
}

interface InviteProblemProps {
  message: string;
  onTryAgain?: (() => void) | undefined;
}

export function InviteProblem({ message, onTryAgain }: InviteProblemProps): ReactNode {
  return (
    <>
      <AccountHeading title="We couldn’t open that invite">
        <span role="alert">{message}</span>
      </AccountHeading>
      <InviteActions>
        {onTryAgain !== undefined && <Button onClick={onTryAgain}>Try again</Button>}
        <ButtonLink href="/homes/new" variant={onTryAgain === undefined ? 'primary' : 'secondary'}>
          Enter a code instead
        </ButtonLink>
      </InviteActions>
    </>
  );
}

export function OpeningInvite(): ReactNode {
  return (
    <p role="status" className="my-auto text-center text-lg">
      Opening your invite…
    </p>
  );
}
