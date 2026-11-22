'use client';

import { createContext, use } from 'react';
import type { ReactNode } from 'react';
import type { AccountAuth } from './account-auth';

const AccountAuthContext = createContext<AccountAuth | null>(null);

interface AccountAuthProviderProps {
  auth: AccountAuth;
  children: ReactNode;
}

export function AccountAuthProvider({ auth, children }: AccountAuthProviderProps): ReactNode {
  return <AccountAuthContext value={auth}>{children}</AccountAuthContext>;
}

export function useAccountAuth(): AccountAuth {
  const auth = use(AccountAuthContext);
  if (auth === null) throw new Error('useAccountAuth needs an AccountAuthProvider above it');
  return auth;
}
