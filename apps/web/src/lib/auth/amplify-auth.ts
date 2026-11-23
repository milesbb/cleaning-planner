import type { CognitoFunctions } from './account-auth';

const USER_POOL_ID_PATTERN = /^[a-z]{2}-[a-z]+-\d_[A-Za-z0-9]+$/;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9]{1,128}$/;

export interface AuthSettings {
  userPoolId: string;
  userPoolClientId: string;
}

interface PublicAuthSettings {
  userPoolId: string | undefined;
  userPoolClientId: string | undefined;
}

// The Amplify Auth calls the app makes; `aws-amplify/auth` itself fits this shape.
export type AmplifyAuth = CognitoFunctions;

export interface AmplifyModules {
  configure: (settings: AuthSettings) => void;
  auth: AmplifyAuth;
}

export type LoadAmplifyAuth = () => Promise<AmplifyAuth>;

export function readAuthSettings({
  userPoolId,
  userPoolClientId,
}: PublicAuthSettings): AuthSettings | null {
  if (userPoolId === undefined || !USER_POOL_ID_PATTERN.test(userPoolId)) return null;
  if (userPoolClientId === undefined || !CLIENT_ID_PATTERN.test(userPoolClientId)) return null;
  return { userPoolId, userPoolClientId };
}

async function importAmplify(): Promise<AmplifyModules> {
  const [{ Amplify }, auth] = await Promise.all([
    import('aws-amplify'),
    import('aws-amplify/auth'),
  ]);
  return {
    configure: (settings): void => {
      Amplify.configure({ Auth: { Cognito: settings } });
    },
    auth,
  };
}

// Amplify is large, so pages don't download it up front: it loads (and is
// configured, once) the first time anything needs sign-in.
export function lazyAmplifyAuth(
  settings: AuthSettings | null,
  load: () => Promise<AmplifyModules> = importAmplify,
): LoadAmplifyAuth {
  let loading: Promise<AmplifyAuth> | null = null;
  return () => {
    loading ??= load().then(
      ({ configure, auth }) => {
        if (settings !== null) configure(settings);
        return auth;
      },
      (error: unknown) => {
        loading = null;
        throw error;
      },
    );
    return loading;
  };
}

export function cognitoFunctionsFrom(loadAuth: LoadAmplifyAuth): CognitoFunctions {
  return {
    signUp: async (input) => (await loadAuth()).signUp(input),
    confirmSignUp: async (input) => (await loadAuth()).confirmSignUp(input),
    resendSignUpCode: async (input) => (await loadAuth()).resendSignUpCode(input),
    signIn: async (input) => (await loadAuth()).signIn(input),
    resetPassword: async (input) => (await loadAuth()).resetPassword(input),
    confirmResetPassword: async (input) => (await loadAuth()).confirmResetPassword(input),
    fetchAuthSession: async () => (await loadAuth()).fetchAuthSession(),
  };
}

export function accessTokenFrom(loadAuth: LoadAmplifyAuth): () => Promise<string | null> {
  return async () => {
    try {
      const { tokens } = await (await loadAuth()).fetchAuthSession();
      return tokens?.accessToken.toString() ?? null;
    } catch {
      return null;
    }
  };
}
