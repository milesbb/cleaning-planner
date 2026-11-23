'use client';

import type { ReactNode } from 'react';
import { isDeadInvite, useInvite } from './use-invite';
import { InviteProblem, InvitePreviewView, OpeningInvite, SignedOutInvite } from './invite-views';
import { useInviteCode } from './use-invite-code';

const NO_CODE = 'This link doesn’t have a whole invite code. Ask for a new link, or type the code.';

function InviteForCode({ code }: { code: string }): ReactNode {
  const { view, accept, notNow } = useInvite(code);
  if (view.error !== null) {
    const tryAgain = isDeadInvite(view.error) ? undefined : (): void => void view.refetch();
    return <InviteProblem message={view.error.message} onTryAgain={tryAgain} />;
  }
  if (view.data === undefined) return <OpeningInvite />;
  if (view.data.kind === 'signedOut') return <SignedOutInvite />;
  if (view.data.preview.isMember) return <OpeningInvite />;
  return (
    <InvitePreviewView
      preview={view.data.preview}
      isJoining={accept.isPending || accept.isSuccess}
      joinError={accept.error?.message ?? null}
      onJoin={() => {
        accept.mutate();
      }}
      onNotNow={notNow}
    />
  );
}

export function JoinInvite(): ReactNode {
  const code = useInviteCode();
  if (code === undefined) return <OpeningInvite />;
  if (code === null) return <InviteProblem message={NO_CODE} />;
  return <InviteForCode code={code} />;
}
