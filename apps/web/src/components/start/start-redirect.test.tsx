import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '../../lib/api/api-client';
import type { ApiClient } from '../../lib/api/api-client';
import { ApiProvider } from '../../lib/api/api-provider';
import { StartRedirect } from './start-redirect';

const HOMES = [{ id: 'home-1', name: 'Our flat', role: 'owner' }];

function renderStart({
  isSignedIn,
  answer,
}: {
  isSignedIn: boolean;
  answer: () => Promise<unknown>;
}): { goTo: ReturnType<typeof vi.fn> } {
  const goTo = vi.fn();
  const client: ApiClient = {
    request: <Result,>(request: { response: { parse: (value: unknown) => Result } }) =>
      answer().then((value) => request.response.parse(value)),
  };
  render(
    <ApiProvider client={client} onSignedOut={vi.fn()}>
      <StartRedirect isSignedIn={() => Promise.resolve(isSignedIn)} goTo={goTo} />
    </ApiProvider>,
  );
  return { goTo };
}

describe('StartRedirect', () => {
  it('has no accessibility violations while it decides', async () => {
    renderStart({ isSignedIn: true, answer: () => new Promise(() => undefined) });
    expect(await axe(document.body)).toHaveNoViolations();
    expect(screen.getByRole('status')).toHaveTextContent('Getting your homes ready');
  });

  it('sends someone signed out to the welcome screen without calling the API', async () => {
    const answer = vi.fn(() => Promise.resolve(HOMES));
    const { goTo } = renderStart({ isSignedIn: false, answer });
    await waitFor(() => {
      expect(goTo).toHaveBeenCalledWith('/welcome');
    });
    expect(answer).not.toHaveBeenCalled();
  });

  it('sends someone without a home to start one', async () => {
    const { goTo } = renderStart({ isSignedIn: true, answer: () => Promise.resolve([]) });
    await waitFor(() => {
      expect(goTo).toHaveBeenCalledWith('/homes/new');
    });
  });

  it('sends someone with a home to today', async () => {
    const { goTo } = renderStart({ isSignedIn: true, answer: () => Promise.resolve(HOMES) });
    await waitFor(() => {
      expect(goTo).toHaveBeenCalledWith('/today');
    });
  });

  it('explains when the homes cannot be loaded', async () => {
    const { goTo } = renderStart({
      isSignedIn: true,
      answer: () =>
        Promise.reject(new ApiRequestError('rejected', 'Something went wrong. Try again.')),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.');
    expect(goTo).not.toHaveBeenCalled();
  });
});
