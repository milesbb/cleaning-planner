import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  accessTokenFrom,
  cognitoFunctionsFrom,
  lazyAmplifyAuth,
  readAuthSettings,
  storedSessionCheck,
} from './amplify-auth';
import type { AmplifyAuth, AmplifyModules } from './amplify-auth';

const SETTINGS = { userPoolId: 'ap-southeast-2_Example1', userPoolClientId: 'exampleclientid123' };

function fakeAuth(overrides: Partial<AmplifyAuth> = {}): AmplifyAuth {
  return {
    signUp: vi.fn(),
    confirmSignUp: vi.fn(),
    resendSignUpCode: vi.fn(),
    signIn: vi.fn(),
    resetPassword: vi.fn(),
    confirmResetPassword: vi.fn(),
    fetchAuthSession: vi.fn(() => Promise.resolve({})),
    signOut: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

function loaderFor(auth: AmplifyAuth): {
  load: ReturnType<typeof vi.fn<() => Promise<AmplifyModules>>>;
  configure: ReturnType<typeof vi.fn>;
} {
  const configure = vi.fn();
  const load = vi.fn(() => Promise.resolve({ configure, auth }));
  return { load, configure };
}

describe('readAuthSettings', () => {
  it('reads the user pool from the public settings', () => {
    expect(readAuthSettings(SETTINGS)).toEqual(SETTINGS);
  });

  it.each([
    ['missing', { userPoolId: undefined, userPoolClientId: undefined }],
    ['empty', { userPoolId: '', userPoolClientId: '' }],
    ['malformed', { userPoolId: 'not a pool', userPoolClientId: 'exampleclientid123' }],
  ])('treats %s settings as not set up', (_description, settings) => {
    expect(readAuthSettings(settings)).toBeNull();
  });
});

describe('lazyAmplifyAuth', () => {
  it('downloads nothing until sign-in is first needed', () => {
    const { load } = loaderFor(fakeAuth());
    lazyAmplifyAuth(SETTINGS, load);
    expect(load).not.toHaveBeenCalled();
  });

  it('loads Amplify once and configures Cognito sign-in only', async () => {
    const auth = fakeAuth();
    const { load, configure } = loaderFor(auth);
    const loadAuth = lazyAmplifyAuth(SETTINGS, load);
    await expect(loadAuth()).resolves.toBe(auth);
    await loadAuth();
    expect(load).toHaveBeenCalledOnce();
    expect(configure).toHaveBeenCalledExactlyOnceWith(SETTINGS);
  });

  it('configures nothing without settings', async () => {
    const { load, configure } = loaderFor(fakeAuth());
    await lazyAmplifyAuth(null, load)();
    expect(configure).not.toHaveBeenCalled();
  });

  it('tries the download again after it failed', async () => {
    const auth = fakeAuth();
    const configure = vi.fn();
    const load = vi
      .fn<() => Promise<AmplifyModules>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ configure, auth });
    const loadAuth = lazyAmplifyAuth(SETTINGS, load);
    await expect(loadAuth()).rejects.toThrow('offline');
    await expect(loadAuth()).resolves.toBe(auth);
  });
});

describe('cognitoFunctionsFrom', () => {
  it('calls Amplify only once it has loaded', async () => {
    const signIn = vi.fn(() => Promise.resolve({ nextStep: { signInStep: 'DONE' } }));
    const cognito = cognitoFunctionsFrom(() => Promise.resolve(fakeAuth({ signIn })));
    await cognito.signIn({ username: 'sam@example.com', password: 'lemon kettle sunday' });
    expect(signIn).toHaveBeenCalledWith({
      username: 'sam@example.com',
      password: 'lemon kettle sunday',
    });
  });

  it('signs out through Amplify', async () => {
    const signOut = vi.fn(() => Promise.resolve());
    await cognitoFunctionsFrom(() => Promise.resolve(fakeAuth({ signOut }))).signOut();
    expect(signOut).toHaveBeenCalled();
  });
});

describe('accessTokenFrom', () => {
  it('returns the current access token', async () => {
    const fetchAuthSession = vi.fn(() =>
      Promise.resolve({ tokens: { accessToken: { toString: () => 'the-access-token' } } }),
    );
    const getAccessToken = accessTokenFrom(() => Promise.resolve(fakeAuth({ fetchAuthSession })));
    await expect(getAccessToken()).resolves.toBe('the-access-token');
  });

  it('returns null when signed out', async () => {
    await expect(accessTokenFrom(() => Promise.resolve(fakeAuth()))()).resolves.toBeNull();
  });

  it('returns null when the session cannot be refreshed or Amplify cannot load', async () => {
    const fetchAuthSession = vi.fn(() => Promise.reject(new Error('Refresh token expired')));
    await expect(
      accessTokenFrom(() => Promise.resolve(fakeAuth({ fetchAuthSession })))(),
    ).resolves.toBeNull();
    await expect(accessTokenFrom(() => Promise.reject(new Error('offline')))()).resolves.toBeNull();
  });
});

describe('the signed-out shortcut', () => {
  const LAST_USER_KEY = `CognitoIdentityServiceProvider.${SETTINGS.userPoolClientId}.LastAuthUser`;

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('knows nobody is signed in when the browser holds no Cognito session', () => {
    expect(storedSessionCheck(SETTINGS)()).toBe(false);
    window.localStorage.setItem(LAST_USER_KEY, 'user-sam');
    expect(storedSessionCheck(SETTINGS)()).toBe(true);
  });

  it('has no session to find when sign-in is not set up', () => {
    window.localStorage.setItem(LAST_USER_KEY, 'user-sam');
    expect(storedSessionCheck(null)()).toBe(false);
  });

  it('asks Amplify after all when storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(storedSessionCheck(SETTINGS)()).toBe(true);
  });

  it('answers signed out without downloading Amplify', async () => {
    const loadAuth = vi.fn(() => Promise.resolve(fakeAuth()));
    const signedOut = (): boolean => false;
    await expect(cognitoFunctionsFrom(loadAuth, signedOut).fetchAuthSession()).resolves.toEqual({});
    await expect(accessTokenFrom(loadAuth, signedOut)()).resolves.toBeNull();
    expect(loadAuth).not.toHaveBeenCalled();
  });

  it('still loads Amplify to sign in, even with no stored session', async () => {
    const loadAuth = vi.fn(() => Promise.resolve(fakeAuth()));
    await cognitoFunctionsFrom(loadAuth, () => false).signIn({
      username: 'sam@example.com',
      password: 'lemon kettle sunday',
    });
    expect(loadAuth).toHaveBeenCalledOnce();
  });
});
