'use client';

import { useState, useSyncExternalStore } from 'react';
import { emailError } from '@/lib/auth/account-validation';
import { pendingEmail } from '@/lib/auth/pending-email';
import { useFields } from './use-fields';
import type { Fields } from './use-fields';

const NEVER_CHANGES = (): (() => void) => () => undefined;

// The email this tab is waiting on a code for. Null on the server and in a
// fresh tab, where the screen asks for it instead.
export function useKnownEmail(): string | null {
  return useSyncExternalStore(NEVER_CHANGES, pendingEmail, () => null);
}

export interface CodeFlow {
  knownEmail: string | null;
  emailField: Fields<'email'>;
  code: string;
  setCode: (code: string) => void;
  codeError: string | undefined;
  setCodeError: (error: string | undefined) => void;
  status: string | null;
  setStatus: (status: string | null) => void;
  // The email to use, or null after showing why the typed one won't do.
  checkedEmail: () => string | null;
}

// State shared by the two screens that take an emailed code.
export function useCodeFlow(): CodeFlow {
  const knownEmail = useKnownEmail();
  const emailField = useFields({ email: '' });
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [status, setStatus] = useState<string | null>(null);
  const checkedEmail = (): string | null => {
    if (knownEmail !== null) return knownEmail;
    const error = emailError(emailField.values.email);
    emailField.setErrors({ email: error });
    return error === undefined ? emailField.values.email.trim() : null;
  };
  return {
    knownEmail,
    emailField,
    code,
    setCode,
    codeError,
    setCodeError,
    status,
    setStatus,
    checkedEmail,
  };
}
