'use client';

import { inviteCodeSchema } from '@cleaning-planner/contracts/invite';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AccountForm } from '@/components/account/account-screen';
import { useFields } from '@/components/account/use-fields';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { joinPathFor } from '@/lib/navigation/start-route';

const CODE_HINT = 'The 8 letters and numbers from the person who invited you.';

export function JoinWithCode(): ReactNode {
  const router = useRouter();
  const fields = useFields({ code: '' });
  const submit = (): boolean => {
    const parsed = inviteCodeSchema.safeParse(fields.values.code);
    if (!parsed.success) {
      fields.setErrors({ code: parsed.error.issues[0]?.message });
      return false;
    }
    fields.setErrors({});
    router.push(joinPathFor(parsed.data));
    return true;
  };
  return (
    <AccountForm
      onSubmit={submit}
      actions={
        <Button type="submit" variant="secondary">
          Join
        </Button>
      }
    >
      <TextField
        label="Invite code"
        hint={CODE_HINT}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        {...fields.bind('code')}
      />
    </AccountForm>
  );
}
