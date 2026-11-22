import { describe, expect, it, vi } from 'vitest';
import { createAppApiClient, readApiUrl } from './app-client';

vi.mock('../auth/amplify-auth', () => ({
  getAccessToken: (): Promise<string> => Promise.resolve('token'),
}));

describe('readApiUrl', () => {
  it('accepts the deployed https API', () => {
    expect(readApiUrl('https://abc123.execute-api.ap-southeast-2.amazonaws.com/')).toBe(
      'https://abc123.execute-api.ap-southeast-2.amazonaws.com',
    );
  });

  it('accepts the local API on this computer', () => {
    expect(readApiUrl('http://localhost:4000')).toBe('http://localhost:4000');
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['plain http elsewhere', 'http://api.example.test'],
    ['not a URL', 'api'],
  ])('treats a %s address as not set up', (_description, value) => {
    expect(readApiUrl(value)).toBeNull();
  });
});

describe('createAppApiClient', () => {
  it('builds a client for a set-up API', () => {
    expect(createAppApiClient('https://api.example.test')).not.toBeNull();
  });

  it('builds nothing when the API is not set up', () => {
    expect(createAppApiClient(undefined)).toBeNull();
  });
});
