import { profileSchema } from '@cleaning-planner/contracts/profile';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { ApiRequestError, NO_CONTENT, createApiClient } from './api-client';

const API_URL = 'https://api.example.test';
const SAM = { id: 'user-sam', name: 'Sam', email: 'sam@example.com', colour: 'blue' };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function clientWith(
  respond: Fetch,
  token: string | null = 'the-access-token',
): { client: ReturnType<typeof createApiClient>; fetchMock: Mock<Fetch> } {
  const fetchMock = vi.fn<Fetch>(respond);
  const client = createApiClient({
    baseUrl: API_URL,
    getAccessToken: () => Promise.resolve(token),
    fetchImplementation: fetchMock,
    timeoutMs: 50,
  });
  return { client, fetchMock };
}

async function failureOf(promise: Promise<unknown>): Promise<ApiRequestError> {
  const outcome: unknown = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  if (outcome instanceof ApiRequestError) return outcome;
  throw new Error('Expected the request to fail with an ApiRequestError');
}

describe('API client', () => {
  it('sends the access token and JSON body, and parses the answer with the contract', async () => {
    const { client, fetchMock } = clientWith(() => Promise.resolve(jsonResponse(200, SAM)));
    await expect(
      client.request({
        method: 'PATCH',
        path: '/v1/me',
        body: { name: 'Sam' },
        response: profileSchema,
      }),
    ).resolves.toEqual(SAM);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.example.test/v1/me');
    expect(init).toMatchObject({ method: 'PATCH', body: '{"name":"Sam"}' });
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer the-access-token');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('accepts an empty answer where none is expected', async () => {
    const { client } = clientWith(() => Promise.resolve(new Response(null, { status: 204 })));
    await expect(
      client.request({ method: 'DELETE', path: '/v1/households/home-1', response: NO_CONTENT }),
    ).resolves.toBeUndefined();
  });

  it('rejects an answer that does not match the contract', async () => {
    const { client } = clientWith(() =>
      Promise.resolve(jsonResponse(200, { ...SAM, colour: 'mauve' })),
    );
    const error = await failureOf(
      client.request({ method: 'GET', path: '/v1/me', response: profileSchema }),
    );
    expect(error.kind).toBe('unexpected');
    expect(error.message).toBe('Something went wrong. Try again.');
  });

  it('treats a 401 as signed out', async () => {
    const { client } = clientWith(() =>
      Promise.resolve(jsonResponse(401, { message: 'Unauthorized' })),
    );
    const error = await failureOf(
      client.request({ method: 'GET', path: '/v1/me', response: profileSchema }),
    );
    expect(error.kind).toBe('signedOut');
  });

  it('does not call the API without a token', async () => {
    const { client, fetchMock } = clientWith(() => Promise.resolve(jsonResponse(200, SAM)), null);
    const error = await failureOf(
      client.request({ method: 'GET', path: '/v1/me', response: profileSchema }),
    );
    expect(error.kind).toBe('signedOut');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes on the API’s own message and field errors', async () => {
    const { client } = clientWith(() =>
      Promise.resolve(
        jsonResponse(400, {
          error: {
            code: 'badRequest',
            message: 'Check the highlighted fields',
            fields: { name: 'Enter a name' },
          },
        }),
      ),
    );
    const error = await failureOf(
      client.request({
        method: 'PATCH',
        path: '/v1/me',
        body: { name: '' },
        response: profileSchema,
      }),
    );
    expect(error).toMatchObject({
      kind: 'rejected',
      status: 400,
      code: 'badRequest',
      message: 'Check the highlighted fields',
      fields: { name: 'Enter a name' },
    });
  });

  it('gives a calm message for server failures', async () => {
    const { client } = clientWith(() =>
      Promise.resolve(new Response('Bad gateway', { status: 502 })),
    );
    const error = await failureOf(
      client.request({ method: 'GET', path: '/v1/me', response: profileSchema }),
    );
    expect(error).toMatchObject({
      kind: 'unavailable',
      message: 'Something went wrong on our side. Try again in a moment.',
    });
  });

  it('says when the network is unreachable', async () => {
    const { client } = clientWith(() => Promise.reject(new TypeError('Failed to fetch')));
    const error = await failureOf(
      client.request({ method: 'GET', path: '/v1/me', response: profileSchema }),
    );
    expect(error).toMatchObject({
      kind: 'offline',
      message: 'Can’t reach Cleaning Planner. Check your connection and try again.',
    });
  });

  it('gives up on a request that takes too long', async () => {
    const { client } = clientWith(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation timed out', 'TimeoutError'));
          });
        }),
    );
    const error = await failureOf(
      client.request({ method: 'GET', path: '/v1/me', response: profileSchema }),
    );
    expect(error).toMatchObject({ kind: 'timeout', message: 'That took too long. Try again.' });
  });

  it('only calls paths under /v1/', async () => {
    const { client, fetchMock } = clientWith(() => Promise.resolve(jsonResponse(200, SAM)));
    await expect(
      client.request({ method: 'GET', path: '//evil.example/v1/me', response: profileSchema }),
    ).rejects.toThrow('API paths start with /v1/');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
