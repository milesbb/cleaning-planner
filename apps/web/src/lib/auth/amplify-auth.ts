import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';

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

export function readAuthSettings({
  userPoolId,
  userPoolClientId,
}: PublicAuthSettings): AuthSettings | null {
  if (userPoolId === undefined || !USER_POOL_ID_PATTERN.test(userPoolId)) return null;
  if (userPoolClientId === undefined || !CLIENT_ID_PATTERN.test(userPoolClientId)) return null;
  return { userPoolId, userPoolClientId };
}

export function configureAuth(settings: AuthSettings | null): void {
  if (settings === null) return;
  Amplify.configure({ Auth: { Cognito: settings } });
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const { tokens } = await fetchAuthSession();
    return tokens?.accessToken.toString() ?? null;
  } catch {
    return null;
  }
}
