import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import type { ApiClient, ApiRequest } from '@/lib/api/api-client';
import { ApiProvider } from '@/lib/api/api-provider';
import { AccountAuthProvider } from '@/lib/auth/account-auth-provider';
import { forgetPendingInvite, pendingInvite } from '@/lib/invites/pending-invite';
import { stubAccountAuth } from '@/test/account-auth-stub';
import { JoinInvite } from './join-invite';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): typeof router => router }));

const PREVIEW = {
  householdName: 'Our flat',
  invitedByName: 'Sam',
  memberCount: 2,
  expiresAt: '2026-11-30T09:00:00.000Z',
  isMember: false,
};
const JOINED = { id: 'home-1', name: 'Our flat', role: 'member' };
const PREVIEW_ROUTE = 'GET /v1/invites/7K3M9QZA';
const ACCEPT_ROUTE = 'POST /v1/invites/7K3M9QZA/accept';
const UNKNOWN_CODE = 'That invite code isn’t valid. Ask for a new one.';
const EXPIRED = 'That invite has expired. Ask for a new one.';
const LOCKED_OUT = 'Too many wrong codes. Try again in an hour.';

type Answers = Record<string, () => Promise<unknown>>;

interface RecordingClient extends ApiClient {
  calls: string[];
}

function clientAnswering(answers: Answers): RecordingClient {
  const calls: string[] = [];
  return {
    calls,
    request: async <Result,>(request: ApiRequest<Result>): Promise<Result> => {
      const route = `${request.method} ${request.path}`;
      calls.push(route);
      const answer = answers[route];
      if (answer === undefined) throw new Error(`No answer for ${route}`);
      return request.response.parse(await answer());
    },
  };
}

interface OpenOptions {
  isSignedIn?: boolean;
  answers?: Answers;
}

function openInvite(
  address: string,
  { isSignedIn = true, answers = {} }: OpenOptions = {},
): RecordingClient {
  window.history.replaceState(null, '', address);
  const client = clientAnswering(answers);
  const auth = stubAccountAuth({ isSignedIn: () => Promise.resolve(isSignedIn) });
  render(
    <AccountAuthProvider auth={auth}>
      <ApiProvider client={client} onSignedOut={vi.fn()}>
        <main>
          <JoinInvite />
        </main>
      </ApiProvider>
    </AccountAuthProvider>,
  );
  return client;
}

function rejectedWith(
  code: 'notFound' | 'gone' | 'tooManyRequests',
  message: string,
): () => Promise<never> {
  return () => Promise.reject(new ApiRequestError('rejected', message, { code }));
}

const previewAnswer: Answers = { [PREVIEW_ROUTE]: () => Promise.resolve(PREVIEW) };

afterEach(() => {
  vi.clearAllMocks();
  forgetPendingInvite();
  window.history.replaceState(null, '', '/');
});

describe('JoinInvite', () => {
  it('has no accessibility violations', async () => {
    openInvite('/join?code=7K3M9QZA', { answers: previewAnswer });
    await screen.findByRole('heading', { name: 'Join Our flat' });
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('says it is opening the invite while it loads', () => {
    openInvite('/join?code=7K3M9QZA', {
      answers: { [PREVIEW_ROUTE]: () => new Promise(() => undefined) },
    });
    expect(screen.getByRole('status')).toHaveTextContent('Opening your invite');
  });

  it('shows who invited you and how many people live there', async () => {
    openInvite('/join?code=7k3m9qza', { answers: previewAnswer });
    expect(await screen.findByRole('heading', { name: 'Join Our flat' })).toBeInTheDocument();
    expect(screen.getByText(/Sam invited you\. 2 people live there now\./)).toBeInTheDocument();
  });

  it('joins the home and opens today', async () => {
    const client = openInvite('/join?code=7K3M9QZA', {
      answers: { ...previewAnswer, [ACCEPT_ROUTE]: () => Promise.resolve(JOINED) },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Join Our flat' }));
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/today');
    });
    expect(client.calls).toContain(ACCEPT_ROUTE);
    expect(pendingInvite()).toBeNull();
  });

  it('explains a failed join and lets you try again', async () => {
    openInvite('/join?code=7K3M9QZA', {
      answers: { ...previewAnswer, [ACCEPT_ROUTE]: rejectedWith('gone', EXPIRED) },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Join Our flat' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(EXPIRED);
    expect(screen.getByRole('button', { name: 'Join Our flat' })).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('takes someone who already lives there straight to the home', async () => {
    const client = openInvite('/join?code=7K3M9QZA', {
      answers: { [PREVIEW_ROUTE]: () => Promise.resolve({ ...PREVIEW, isMember: true }) },
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/today');
    });
    expect(client.calls).not.toContain(ACCEPT_ROUTE);
  });

  it('lets you say not now, forgetting the invite', async () => {
    openInvite('/join?code=7K3M9QZA', { answers: previewAnswer });
    await userEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(pendingInvite()).toBeNull();
  });

  it('keeps the invite for after sign-up when you are signed out', async () => {
    const client = openInvite('/join?code=7K3M9QZA', { isSignedIn: false });
    expect(
      await screen.findByRole('heading', { name: 'You’re invited to a home' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/sign-in');
    expect(pendingInvite()).toBe('7K3M9QZA');
    expect(client.calls).toEqual([]);
  });

  it.each([
    ['an unknown code', 'notFound' as const, UNKNOWN_CODE],
    ['an expired invite', 'gone' as const, EXPIRED],
  ])('explains %s and offers to type another code', async (_case, code, message) => {
    openInvite('/join?code=7K3M9QZA', {
      answers: { [PREVIEW_ROUTE]: rejectedWith(code, message) },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enter a code instead' })).toHaveAttribute(
      'href',
      '/homes/new',
    );
    await waitFor(() => {
      expect(pendingInvite()).toBeNull();
    });
  });

  it('offers to try again when the invite could not be loaded', async () => {
    let attempts = 0;
    openInvite('/join?code=7K3M9QZA', {
      answers: {
        [PREVIEW_ROUTE]: () => {
          attempts += 1;
          return attempts === 1
            ? rejectedWith('tooManyRequests', LOCKED_OUT)()
            : Promise.resolve(PREVIEW);
        },
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(LOCKED_OUT);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Join Our flat' })).toBeInTheDocument();
  });

  it('explains a link without a whole code, without calling the API', async () => {
    const client = openInvite('/join?code=7K3M');
    expect(await screen.findByRole('alert')).toHaveTextContent('doesn’t have a whole invite code');
    expect(client.calls).toEqual([]);
  });
});
