'use client';

import { householdSummarySchema } from '@cleaning-planner/contracts/household';
import { invitePreviewSchema } from '@cleaning-planner/contracts/invite';
import type { InvitePreview } from '@cleaning-planner/contracts/invite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { ApiRequestError } from '@/lib/api/api-client';
import { useApiClient } from '@/lib/api/api-provider';
import { rememberCurrentHome } from '@/lib/home/current-home';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { forgetPendingInvite, rememberPendingInvite } from '@/lib/invites/pending-invite';

type InviteView = { kind: 'signedOut' } | { kind: 'preview'; preview: InvitePreview };

export interface Invite {
  view: UseQueryResult<InviteView>;
  accept: UseMutationResult<unknown, Error, void>;
  notNow: () => void;
}

const DEAD_INVITE_CODES = new Set(['notFound', 'gone']);

export function isDeadInvite(error: Error): boolean {
  return (
    error instanceof ApiRequestError && error.code !== null && DEAD_INVITE_CODES.has(error.code)
  );
}

function useInviteView(code: string): UseQueryResult<InviteView> {
  const auth = useAccountAuth();
  const client = useApiClient();
  return useQuery({
    queryKey: ['invite', code],
    gcTime: 0,
    queryFn: async (): Promise<InviteView> => {
      if (!(await auth.isSignedIn())) return { kind: 'signedOut' };
      const preview = await client.request({
        method: 'GET',
        path: `/v1/invites/${encodeURIComponent(code)}`,
        response: invitePreviewSchema,
      });
      return { kind: 'preview', preview };
    },
  });
}

function useFollowUps(view: UseQueryResult<InviteView>, goHome: () => void): void {
  const isMember = view.data?.kind === 'preview' && view.data.preview.isMember;
  const isDead = view.error !== null && isDeadInvite(view.error);
  useEffect(() => {
    if (isMember) goHome();
  }, [isMember, goHome]);
  useEffect(() => {
    if (isDead) forgetPendingInvite();
  }, [isDead]);
}

// Opening an invite: kept for after sign-up while signed out, previewed once
// signed in, and taken straight to the home when the person already lives there.
export function useInvite(code: string): Invite {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const view = useInviteView(code);
  useEffect(() => {
    rememberPendingInvite(code);
  }, [code]);
  const leaveFor = useCallback(
    (path: string): void => {
      forgetPendingInvite();
      router.replace(path);
    },
    [router],
  );
  const goHome = useCallback((): void => {
    leaveFor('/today');
  }, [leaveFor]);
  useFollowUps(view, goHome);
  const accept = useMutation({
    mutationFn: () =>
      client.request({
        method: 'POST',
        path: `/v1/invites/${encodeURIComponent(code)}/accept`,
        response: householdSummarySchema,
      }),
    onSuccess: async (home): Promise<void> => {
      rememberCurrentHome(home.id);
      await queryClient.invalidateQueries({ queryKey: ['homes'] });
      goHome();
    },
  });
  return {
    view,
    accept,
    notNow: (): void => {
      leaveFor('/');
    },
  };
}
