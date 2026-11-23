import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import type { AccountAuth } from '@/lib/auth/account-auth';
import { AccountAuthProvider } from '@/lib/auth/account-auth-provider';

export function stubAccountAuth(overrides: Partial<AccountAuth> = {}): AccountAuth {
  return {
    signUp: vi.fn(() => Promise.resolve()),
    confirmSignUp: vi.fn(() => Promise.resolve('signedIn' as const)),
    resendSignUpCode: vi.fn(() => Promise.resolve()),
    signIn: vi.fn(() => Promise.resolve('signedIn' as const)),
    requestPasswordReset: vi.fn(() => Promise.resolve()),
    resetPassword: vi.fn(() => Promise.resolve()),
    isSignedIn: vi.fn(() => Promise.resolve(false)),
    mightBeSignedIn: vi.fn(() => false),
    ...overrides,
  };
}

export function renderWithAuth(ui: ReactNode, auth: AccountAuth = stubAccountAuth()): RenderResult {
  return render(<AccountAuthProvider auth={auth}>{ui}</AccountAuthProvider>);
}
