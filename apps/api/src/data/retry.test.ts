import { describe, expect, it, vi } from 'vitest';
import { unprocessedRequests } from './batch-write';
import { retryUntilEmpty } from './retry';

const noWait = (): Promise<void> => Promise.resolve();

describe('retryUntilEmpty', () => {
  it('stops as soon as nothing is left', async () => {
    const attempt = vi.fn((items: string[]) => Promise.resolve(items.slice(1)));
    await retryUntilEmpty(['a'], attempt, { wait: noWait });
    expect(attempt).toHaveBeenCalledOnce();
  });

  it('retries what is left, waiting longer each time', async () => {
    const wait = vi.fn(noWait);
    const attempt = vi.fn((items: string[]) => Promise.resolve(items.slice(1)));
    await retryUntilEmpty(['a', 'b', 'c'], attempt, { wait, firstDelayMs: 10 });
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[10], [20]]);
  });

  it('gives up after the last attempt and says how much is left', async () => {
    const attempt = vi.fn((items: string[]) => Promise.resolve(items));
    await expect(
      retryUntilEmpty(['a', 'b'], attempt, { wait: noWait, maxAttempts: 3 }),
    ).rejects.toThrow('Still 2 items to write after 3 attempts');
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('does nothing when there is nothing to write', async () => {
    const attempt = vi.fn((items: string[]) => Promise.resolve(items));
    await retryUntilEmpty([], attempt);
    expect(attempt).not.toHaveBeenCalled();
  });

  it('waits for real by default', async () => {
    let calls = 0;
    await retryUntilEmpty(
      ['a'],
      (items) => {
        calls += 1;
        return Promise.resolve(calls === 1 ? items : []);
      },
      { firstDelayMs: 1 },
    );
    expect(calls).toBe(2);
  });
});

describe('unprocessedRequests', () => {
  it('returns the puts and deletes DynamoDB did not get to', () => {
    expect(
      unprocessedRequests(
        {
          UnprocessedItems: {
            data: [
              { PutRequest: { Item: { pk: 'a' } } },
              { DeleteRequest: { Key: { pk: 'b' } } },
              {},
            ],
          },
        },
        'data',
      ),
    ).toEqual([{ PutRequest: { Item: { pk: 'a' } } }, { DeleteRequest: { Key: { pk: 'b' } } }]);
  });

  it('returns nothing when everything was written', () => {
    expect(unprocessedRequests({}, 'data')).toEqual([]);
    expect(unprocessedRequests({ UnprocessedItems: {} }, 'data')).toEqual([]);
  });
});
