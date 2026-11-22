import { getAccessToken } from '../auth/amplify-auth';
import { createApiClient } from './api-client';
import type { ApiClient } from './api-client';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export function readApiUrl(value: string | undefined): string | null {
  if (value === undefined || !URL.canParse(value)) return null;
  const url = new URL(value);
  const isLocal = url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !isLocal) return null;
  return url.origin;
}

export function createAppApiClient(apiUrl: string | undefined): ApiClient | null {
  const baseUrl = readApiUrl(apiUrl);
  if (baseUrl === null) return null;
  return createApiClient({ baseUrl, getAccessToken });
}
