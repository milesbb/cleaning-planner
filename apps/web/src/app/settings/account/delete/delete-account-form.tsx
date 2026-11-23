'use client';

import type { HouseholdSummary } from '@cleaning-planner/contracts/household';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { AccountForm, FormAlert } from '@/components/account/account-screen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldMessages } from '@/components/ui/field-messages';
import { PasswordField } from '@/components/ui/password-field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SettingsSection } from '../../settings-sections';
import { DELETE_HOME, isShared } from './owned-home-choices';
import type { OwnedHome } from './owned-home-choices';
import { useDeleteAccount } from './use-delete-account';
import type { AccountDeletion } from './use-delete-account';

const NOTHING_PICKED = '';

function WhatHappens(): ReactNode {
  return (
    <Card raised={false} className="flex flex-col gap-2">
      <p className="font-bold">This can’t be undone.</p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        <li>Your name, email and colour are removed, and you can’t log in again.</li>
        <li>You leave every home you’re part of. Jobs you’ve done stay in their history.</li>
        <li>Homes you own go to someone who lives there, or are deleted with their jobs.</li>
      </ul>
    </Card>
  );
}

function SharedHomeChoice({
  owned,
  deletion,
}: {
  owned: OwnedHome;
  deletion: AccountDeletion;
}): ReactNode {
  const errorId = useId();
  const { home, others } = owned;
  const options = [
    ...others.map((person) => ({ value: person.userId, label: person.name })),
    { value: DELETE_HOME, label: `Delete ${home.name}` },
  ];
  return (
    <div className="flex flex-col gap-1.5">
      <SegmentedControl<string>
        label={`Who looks after ${home.name}?`}
        options={options}
        value={deletion.picked[home.id] ?? NOTHING_PICKED}
        onValueChange={(choice) => {
          deletion.pick(home.id, choice);
        }}
      />
      <FieldMessages fieldId={errorId} hint={undefined} error={deletion.choiceErrors[home.id]} />
    </div>
  );
}

function HomeOutcome({
  home,
  owned,
  deletion,
}: {
  home: HouseholdSummary;
  owned: OwnedHome | undefined;
  deletion: AccountDeletion;
}): ReactNode {
  if (owned === undefined) return <p>You’ll leave {home.name}.</p>;
  if (isShared(owned)) return <SharedHomeChoice owned={owned} deletion={deletion} />;
  return <p>{home.name} will be deleted, because nobody else lives there.</p>;
}

interface DeleteAccountFormProps {
  email: string;
  homes: readonly HouseholdSummary[];
  ownedHomes: readonly OwnedHome[];
}

function HomesSection({
  homes,
  ownedHomes,
  deletion,
}: Omit<DeleteAccountFormProps, 'email'> & { deletion: AccountDeletion }): ReactNode {
  return (
    <SettingsSection title="Your homes">
      {homes.length === 0 ? <p>You’re not part of any homes.</p> : null}
      {homes.map((home) => (
        <HomeOutcome
          key={home.id}
          home={home}
          owned={ownedHomes.find((owned) => owned.home.id === home.id)}
          deletion={deletion}
        />
      ))}
    </SettingsSection>
  );
}

export function DeleteAccountForm({ email, homes, ownedHomes }: DeleteAccountFormProps): ReactNode {
  const deletion = useDeleteAccount(email, ownedHomes);
  const { submission } = deletion;
  return (
    <AccountForm
      onSubmit={deletion.submit}
      actions={
        <Button type="submit" variant="danger" disabled={submission.isSubmitting}>
          {submission.isSubmitting ? 'Deleting…' : 'Delete my account'}
        </Button>
      }
    >
      <WhatHappens />
      <HomesSection homes={homes} ownedHomes={ownedHomes} deletion={deletion} />
      <PasswordField
        label="Your password"
        autoComplete="current-password"
        {...deletion.fields.bind('password')}
      />
      {submission.alert === null ? null : <FormAlert>{submission.alert}</FormAlert>}
    </AccountForm>
  );
}
