'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  AccountForm,
  FormAlert,
  FormStatus,
  TEXT_ACTION_CLASSES,
} from '@/components/account/account-screen';
import { hasErrors, useFields } from '@/components/account/use-fields';
import type { Fields } from '@/components/account/use-fields';
import { useSubmission } from '@/components/account/use-submission';
import type { Submission } from '@/components/account/use-submission';
import { AppShell } from '@/components/shell/app-shell';
import { BackLink, PageHeader } from '@/components/shell/page-header';
import { ScreenLoading, ScreenProblem } from '@/components/shell/screen-states';
import { Button, ButtonLink } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { Switch } from '@/components/ui/switch';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { existingPasswordError, newPasswordError } from '@/lib/auth/account-validation';
import { useMe } from '@/lib/home/home-queries';
import { FormColumn } from '../../settings-sections';

const MINIMUM_PASSWORD_LENGTH = 12;
const LOG_IN_AGAIN = `/sign-in?next=${encodeURIComponent('/settings')}`;

type PasswordFieldName = 'current' | 'new';

interface PasswordChangeForm {
  fields: Fields<PasswordFieldName>;
  submission: Submission;
  signOutOtherDevices: boolean;
  setSignOutOtherDevices: (isOn: boolean) => void;
  isChanged: boolean;
  submit: () => boolean;
}

function usePasswordChange(email: string): PasswordChangeForm {
  const auth = useAccountAuth();
  const router = useRouter();
  const submission = useSubmission();
  const fields = useFields<PasswordFieldName>({ current: '', new: '' });
  const [signOutOtherDevices, setSignOutOtherDevices] = useState(true);
  const [isChanged, setIsChanged] = useState(false);
  const submit = (): boolean => {
    const { current, new: newPassword } = fields.values;
    const errors = { current: existingPasswordError(current), new: newPasswordError(newPassword) };
    fields.setErrors(errors);
    if (hasErrors(errors)) return false;
    const change = { email, currentPassword: current, newPassword, signOutOtherDevices };
    submission.run(
      async () => {
        if ((await auth.changePassword(change)) === 'logIn') router.replace(LOG_IN_AGAIN);
        else setIsChanged(true);
      },
      (error) => {
        submission.showAlert(error.message);
      },
    );
    return true;
  };
  return { fields, submission, signOutOtherDevices, setSignOutOtherDevices, isChanged, submit };
}

function PasswordChangeFields({ form }: { form: PasswordChangeForm }): ReactNode {
  return (
    <>
      <div className="flex flex-col gap-1">
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          {...form.fields.bind('current')}
        />
        <Link href="/forgot-password" className={`${TEXT_ACTION_CLASSES} self-end`}>
          Forgot your current password?
        </Link>
      </div>
      <PasswordField
        label="New password"
        autoComplete="new-password"
        minimumLength={MINIMUM_PASSWORD_LENGTH}
        {...form.fields.bind('new')}
      />
      <Switch
        label="Log out on my other devices"
        description="Anyone using your old password on another phone or computer has to log in again."
        checked={form.signOutOtherDevices}
        onCheckedChange={form.setSignOutOtherDevices}
      />
      {form.submission.alert !== null && <FormAlert>{form.submission.alert}</FormAlert>}
    </>
  );
}

function ChangePasswordForm({ email }: { email: string }): ReactNode {
  const form = usePasswordChange(email);
  if (form.isChanged) {
    return (
      <div className="flex flex-col gap-5">
        <FormStatus>Your password has been changed.</FormStatus>
        <ButtonLink href="/settings">Done</ButtonLink>
      </div>
    );
  }
  return (
    <AccountForm
      onSubmit={form.submit}
      actions={
        <Button type="submit" disabled={form.submission.isSubmitting}>
          {form.submission.isSubmitting ? 'Changing…' : 'Change password'}
        </Button>
      }
    >
      <PasswordChangeFields form={form} />
    </AccountForm>
  );
}

export function ChangePasswordScreen(): ReactNode {
  const me = useMe();
  return (
    <AppShell activeTab="settings">
      {me.isError ? (
        <ScreenProblem
          title="Change password"
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
            title="Change password"
            leading={<BackLink href="/settings" label="Back to Settings" />}
          />
          <FormColumn>
            <ChangePasswordForm email={me.data.email} />
          </FormColumn>
        </>
      )}
    </AppShell>
  );
}
