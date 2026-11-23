'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { BackLink, PageHeader } from '@/components/shell/page-header';
import { ScreenLoading, ScreenProblem } from '@/components/shell/screen-states';
import { useMe } from '@/lib/home/home-queries';
import { FormColumn } from '../../settings-sections';
import { ChangedStep, CodeStep, NewEmailStep, SaveFailedStep } from './email-change-steps';
import { useEmailChange } from './use-email-change';

function ChangeEmailFlow({ currentEmail }: { currentEmail: string }): ReactNode {
  const flow = useEmailChange(currentEmail);
  const { step } = flow;
  switch (step.kind) {
    case 'enterEmail':
      return <NewEmailStep flow={flow} currentEmail={currentEmail} />;
    case 'enterCode':
      return <CodeStep flow={flow} newEmail={step.newEmail} />;
    case 'saveFailed':
      return <SaveFailedStep flow={flow} />;
    case 'changed':
      return <ChangedStep newEmail={step.newEmail} />;
  }
}

export function ChangeEmailScreen(): ReactNode {
  const me = useMe();
  return (
    <AppShell activeTab="settings">
      {me.isError ? (
        <ScreenProblem
          title="Change email"
          message={me.error.message}
          retry={() => void me.refetch()}
        />
      ) : null}
      {me.data === undefined && !me.isError ? (
        <ScreenLoading>Getting your account…</ScreenLoading>
      ) : null}
      {me.data === undefined ? null : (
        <>
          <PageHeader
            title="Change email"
            leading={<BackLink href="/settings/account" label="Back to Your account" />}
          />
          <FormColumn>
            <ChangeEmailFlow currentEmail={me.data.email} />
          </FormColumn>
        </>
      )}
    </AppShell>
  );
}
