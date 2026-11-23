'use client';

import type { OwnedHomeChoice } from '@cleaning-planner/contracts/profile';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFields } from '@/components/account/use-fields';
import type { Fields } from '@/components/account/use-fields';
import { useSubmission } from '@/components/account/use-submission';
import type { Submission } from '@/components/account/use-submission';
import { ApiRequestError, NO_CONTENT } from '@/lib/api/api-client';
import { useApiClient } from '@/lib/api/api-provider';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { existingPasswordError } from '@/lib/auth/account-validation';
import { forgetCurrentHome } from '@/lib/home/current-home';
import { checkChoices } from './owned-home-choices';
import type { OwnedHome, PickedOwners } from './owned-home-choices';

const NOT_DELETED = 'Your account wasn’t deleted. Try again.';

export interface AccountDeletion {
  picked: PickedOwners;
  pick: (householdId: string, choice: string) => void;
  choiceErrors: Readonly<Record<string, string>>;
  fields: Fields<'password'>;
  submission: Submission;
  submit: () => boolean;
}

// Deletes the account, showing why if the API refuses. True once it's gone.
function useDeleteMe(submission: Submission): (choices: OwnedHomeChoice[]) => Promise<boolean> {
  const client = useApiClient();
  return async (ownedHomes) => {
    try {
      await client.request({
        method: 'DELETE',
        path: '/v1/me',
        body: { ownedHomes },
        response: NO_CONTENT,
      });
      return true;
    } catch (error) {
      submission.showAlert(error instanceof ApiRequestError ? error.message : NOT_DELETED);
      return false;
    }
  };
}

// Forgets everything this device kept about the deleted account.
function useLeaveForGood(): () => Promise<void> {
  const auth = useAccountAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    forgetCurrentHome();
    queryClient.clear();
    try {
      await auth.signOut();
    } catch {
      // The Cognito user is already deleted, so its tokens are useless anyway.
    }
    router.replace('/welcome');
  };
}

export function useDeleteAccount(email: string, ownedHomes: readonly OwnedHome[]): AccountDeletion {
  const auth = useAccountAuth();
  const submission = useSubmission();
  const fields = useFields({ password: '' });
  const [picked, setPicked] = useState<PickedOwners>({});
  const [choiceErrors, setChoiceErrors] = useState<Record<string, string>>({});
  const deleteMe = useDeleteMe(submission);
  const leaveForGood = useLeaveForGood();
  const submit = (): boolean => {
    const checked = checkChoices(ownedHomes, picked);
    const passwordError = existingPasswordError(fields.values.password);
    setChoiceErrors(checked.isComplete ? {} : checked.errors);
    fields.setErrors({ password: passwordError });
    if (!checked.isComplete || passwordError !== undefined) return false;
    submission.run(
      async () => {
        await auth.recheckPassword(email, fields.values.password);
        if (await deleteMe(checked.ownedHomes)) await leaveForGood();
      },
      (error) => {
        if (error.kind === 'wrongCurrentPassword') fields.setErrors({ password: error.message });
        else submission.showAlert(error.message);
      },
    );
    return true;
  };
  const pick = (householdId: string, choice: string): void => {
    setPicked((current) => ({ ...current, [householdId]: choice }));
  };
  return { picked, pick, choiceErrors, fields, submission, submit };
}
