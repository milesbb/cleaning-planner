import { useMutation } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import type { ApiClient } from '@/lib/api/api-client';
import { ApiProvider } from '@/lib/api/api-provider';
import { QUEUED_REQUEST_KEY } from '@/lib/api/queued-requests';
import type { QueuedRequest } from '@/lib/api/queued-requests';
import { RefusedChangeNotice } from './refused-change-notice';

const TICK: QueuedRequest = {
  method: 'POST',
  path: '/v1/households/home-1/jobs/job-1/completions',
  body: { outcome: 'done', completedOn: '2026-11-23', idempotencyKey: 'key-1' },
  response: 'jobProgress',
};

const refusingClient: ApiClient = {
  request: () => Promise.reject(new ApiRequestError('rejected', 'That job has been removed')),
};

const answeringClient: ApiClient = {
  request: () => new Promise(() => undefined),
};

function ReplaysATick(): ReactNode {
  const { mutate } = useMutation<unknown, Error, QueuedRequest>({
    mutationKey: QUEUED_REQUEST_KEY,
  });
  useEffect(() => {
    mutate(TICK);
  }, [mutate]);
  return null;
}

function renderWith(client: ApiClient): ReturnType<typeof render> {
  return render(
    <ApiProvider client={client} onSignedOut={() => undefined}>
      <RefusedChangeNotice />
      <ReplaysATick />
    </ApiProvider>,
  );
}

describe('RefusedChangeNotice', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWith(refusingClient);
    await screen.findByRole('alert');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says when a change made offline was refused, until dismissed', async () => {
    renderWith(refusingClient);
    expect(await screen.findByRole('alert')).toHaveTextContent('That job has been removed');
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows nothing while changes are fine', () => {
    renderWith(answeringClient);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
