export type PreflightResult = { passed: true } | { passed: false; reason: string };

const DEFAULT_TIMEOUT_MS = 10_000;
// The app's own origin, which an infrastructure rule keeps in AllowedOrigins.
const APP_ORIGIN = 'https://localhost';
const SIGNED_IN_PATH = '/v1/me';

function preflightUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${SIGNED_IN_PATH}`;
}

function failureReason(error: unknown, timeoutMs: number): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return `Browser preflight timed out after ${String(timeoutMs)} ms`;
  }
  const message = error instanceof Error ? error.message : String(error);
  return `Browser preflight request failed: ${message}`;
}

function readPreflight(response: Response): PreflightResult {
  if (!response.ok) {
    return { passed: false, reason: `Browser preflight returned HTTP ${String(response.status)}` };
  }
  if (response.headers.get('access-control-allow-origin') !== APP_ORIGIN) {
    return { passed: false, reason: `Browser preflight did not allow ${APP_ORIGIN}` };
  }
  return { passed: true };
}

// Asks what a browser asks before a signed-in PATCH. Browsers send no token with
// a preflight, so anything other than a 2xx with our origin blocks every call.
export async function checkPreflight(
  baseUrl: string,
  fetchPreflight: typeof fetch = fetch,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<PreflightResult> {
  try {
    const response = await fetchPreflight(preflightUrl(baseUrl), {
      method: 'OPTIONS',
      headers: {
        Origin: APP_ORIGIN,
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return readPreflight(response);
  } catch (error) {
    return { passed: false, reason: failureReason(error, timeoutMs) };
  }
}
