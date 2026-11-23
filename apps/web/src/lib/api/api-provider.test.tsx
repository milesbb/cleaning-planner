import { profileSchema } from '@cleaning-planner/contracts/profile';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from './api-client';
import type { ApiClient } from './api-client';
import { ApiProvider, useApiQuery } from './api-provider';

const SAM = { id: 'user-sam', name: 'Sam', email: 'sam@example.com', colour: 'blue' as const };

function MyName(): ReactNode {
  const profile = useApiQuery(['me'], { method: 'GET', path: '/v1/me', response: profileSchema });
  if (profile.isPending) return <p>Loading</p>;
  if (profile.isError) return <p role="alert">{profile.error.message}</p>;
  return <p>Signed in as {profile.data.name}</p>;
}

function renderWith(client: ApiClient, onSignedOut = vi.fn()): ReturnType<typeof render> {
  return render(
    <ApiProvider client={client} onSignedOut={onSignedOut}>
      <MyName />
    </ApiProvider>,
  );
}

function clientAnswering(answer: () => Promise<unknown>): ApiClient {
  return {
    request: <Result,>(request: { response: { parse: (value: unknown) => Result } }) =>
      answer().then((value) => request.response.parse(value)),
  };
}

function WaitingName({ isEnabled }: { isEnabled: boolean }): ReactNode {
  const profile = useApiQuery(
    ['me'],
    { method: 'GET', path: '/v1/me', response: profileSchema },
    { isEnabled },
  );
  return <p>{profile.data?.name ?? 'Waiting'}</p>;
}

describe('ApiProvider and useApiQuery', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWith(clientAnswering(() => Promise.resolve(SAM)));
    await screen.findByText('Signed in as Sam');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('waits to ask until the query is enabled', async () => {
    const answer = vi.fn(() => Promise.resolve(SAM));
    const client = clientAnswering(answer);
    const { rerender } = render(
      <ApiProvider client={client} onSignedOut={vi.fn()}>
        <WaitingName isEnabled={false} />
      </ApiProvider>,
    );
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(answer).not.toHaveBeenCalled();
    rerender(
      <ApiProvider client={client} onSignedOut={vi.fn()}>
        <WaitingName isEnabled />
      </ApiProvider>,
    );
    expect(await screen.findByText('Sam')).toBeInTheDocument();
  });

  it('loads typed data with one hook', async () => {
    renderWith(clientAnswering(() => Promise.resolve(SAM)));
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(await screen.findByText('Signed in as Sam')).toBeInTheDocument();
  });

  it('shows the API’s message when a request is refused', async () => {
    renderWith(
      clientAnswering(() =>
        Promise.reject(new ApiRequestError('rejected', 'You don’t have access to that')),
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('You don’t have access to that');
  });

  it('sends someone signed out to sign in', async () => {
    const onSignedOut = vi.fn();
    renderWith(
      clientAnswering(() =>
        Promise.reject(new ApiRequestError('signedOut', 'Sign in to continue')),
      ),
      onSignedOut,
    );
    await screen.findByRole('alert');
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });
});
