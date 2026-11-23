import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import type { ApiClient, ApiRequest } from '@/lib/api/api-client';
import { ApiProvider } from '@/lib/api/api-provider';
import type { AccountAuth } from '@/lib/auth/account-auth';
import { AccountAuthProvider } from '@/lib/auth/account-auth-provider';
import { stubAccountAuth } from './account-auth-stub';

// Answers keyed by "METHOD /v1/path"; any other request fails the test.
export type FakeAnswers = Record<string, () => Promise<unknown>>;

export interface FakeApiClient extends ApiClient {
  calls: string[];
  bodies: unknown[];
}

export function clientAnswering(answers: FakeAnswers): FakeApiClient {
  const calls: string[] = [];
  const bodies: unknown[] = [];
  return {
    calls,
    bodies,
    request: async <Result,>(request: ApiRequest<Result>): Promise<Result> => {
      const route = `${request.method} ${request.path}`;
      calls.push(route);
      bodies.push(request.body);
      const answer = answers[route];
      if (answer === undefined) throw new Error(`No answer for ${route}`);
      return request.response.parse(await answer());
    },
  };
}

// Renders with the account auth and the API client the app provides.
export function renderWithApi(
  ui: ReactNode,
  client: ApiClient,
  auth: AccountAuth = stubAccountAuth({ isSignedIn: () => Promise.resolve(true) }),
): RenderResult {
  return render(
    <AccountAuthProvider auth={auth}>
      <ApiProvider client={client} onSignedOut={vi.fn()}>
        {ui}
      </ApiProvider>
    </AccountAuthProvider>,
  );
}
