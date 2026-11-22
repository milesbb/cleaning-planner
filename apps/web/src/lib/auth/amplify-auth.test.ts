import { fetchAuthSession } from 'aws-amplify/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureAuth, getAccessToken, readAuthSettings } from './amplify-auth';

const configure = vi.hoisted(() => vi.fn());

vi.mock('aws-amplify', () => ({ Amplify: { configure } }));
vi.mock('aws-amplify/auth', () => ({ fetchAuthSession: vi.fn() }));

const SETTINGS = { userPoolId: 'ap-southeast-2_Example1', userPoolClientId: 'exampleclientid123' };

beforeEach(() => {
  configure.mockClear();
});

describe('readAuthSettings', () => {
  it('reads the user pool from the public settings', () => {
    expect(
      readAuthSettings({
        userPoolId: SETTINGS.userPoolId,
        userPoolClientId: SETTINGS.userPoolClientId,
      }),
    ).toEqual(SETTINGS);
  });

  it.each([
    ['missing', { userPoolId: undefined, userPoolClientId: undefined }],
    ['empty', { userPoolId: '', userPoolClientId: '' }],
    ['malformed', { userPoolId: 'not a pool', userPoolClientId: 'exampleclientid123' }],
  ])('treats %s settings as not set up', (_description, settings) => {
    expect(readAuthSettings(settings)).toBeNull();
  });
});

describe('configureAuth', () => {
  it('configures Cognito sign-in only', () => {
    configureAuth(SETTINGS);
    expect(configure).toHaveBeenCalledWith({ Auth: { Cognito: SETTINGS } });
  });

  it('does nothing without settings', () => {
    configureAuth(null);
    expect(configure).not.toHaveBeenCalled();
  });
});

describe('getAccessToken', () => {
  it('returns the current access token', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({
      tokens: { accessToken: { toString: () => 'the-access-token', payload: {} } },
    });
    await expect(getAccessToken()).resolves.toBe('the-access-token');
  });

  it('returns null when signed out', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({});
    await expect(getAccessToken()).resolves.toBeNull();
  });

  it('returns null when the session cannot be refreshed', async () => {
    vi.mocked(fetchAuthSession).mockRejectedValue(new Error('Refresh token expired'));
    await expect(getAccessToken()).resolves.toBeNull();
  });
});
