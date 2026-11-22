'use client';

import { useRef, useState } from 'react';
import { AccountAuthError } from '@/lib/auth/account-auth';

const UNEXPECTED = 'Something went wrong. Try again.';

export interface Submission {
  isSubmitting: boolean;
  alert: string | null;
  showAlert: (message: string | null) => void;
  run: (action: () => Promise<void>, onFailure: (error: AccountAuthError) => void) => void;
}

// One form action at a time: busy state, and errors handed back to the form.
export function useSubmission(): Submission {
  const [isSubmitting, setSubmitting] = useState(false);
  const [alert, showAlert] = useState<string | null>(null);
  const isRunning = useRef(false);
  const run: Submission['run'] = (action, onFailure) => {
    if (isRunning.current) return;
    isRunning.current = true;
    setSubmitting(true);
    showAlert(null);
    action()
      .catch((error: unknown) => {
        if (error instanceof AccountAuthError) onFailure(error);
        else showAlert(UNEXPECTED);
      })
      .finally(() => {
        isRunning.current = false;
        setSubmitting(false);
      });
  };
  return { isSubmitting, alert, showAlert, run };
}
