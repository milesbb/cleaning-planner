'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { BackLink, PageHeader } from '@/components/shell/page-header';
import { ScreenLoading, ScreenProblem } from '@/components/shell/screen-states';
import { FormColumn } from '../../settings-sections';
import { DeleteAccountForm } from './delete-account-form';
import { useDeleteAccountSources } from './use-delete-account-sources';

export function DeleteAccountScreen(): ReactNode {
  const sources = useDeleteAccountSources();
  return (
    <AppShell activeTab="settings">
      {sources.kind === 'loading' && <ScreenLoading>Getting your account…</ScreenLoading>}
      {sources.kind === 'failed' && (
        <ScreenProblem title="Delete account" message={sources.message} retry={sources.retry} />
      )}
      {sources.kind === 'ready' && (
        <>
          <PageHeader
            title="Delete account"
            leading={<BackLink href="/settings/account" label="Back to Your account" />}
          />
          <FormColumn>
            <DeleteAccountForm
              email={sources.profile.email}
              homes={sources.homes}
              ownedHomes={sources.ownedHomes}
            />
          </FormColumn>
        </>
      )}
    </AppShell>
  );
}
