export type HealthCheckResult =
  { healthy: true; version: string } | { healthy: false; reason: string };

interface HealthyBody {
  status: 'ok';
  version: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const HEALTH_PATH = '/v1/health';

function isHealthyBody(body: unknown): body is HealthyBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'status' in body &&
    body.status === 'ok' &&
    'version' in body &&
    typeof body.version === 'string'
  );
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function healthUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${HEALTH_PATH}`;
}

function failureReason(error: unknown, timeoutMs: number): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return `Health check timed out after ${String(timeoutMs)} ms`;
  }
  const message = error instanceof Error ? error.message : String(error);
  return `Health check request failed: ${message}`;
}

async function readHealth(response: Response): Promise<HealthCheckResult> {
  if (!response.ok) {
    return { healthy: false, reason: `Health check returned HTTP ${String(response.status)}` };
  }
  const body = parseJson(await response.text());
  if (body === undefined) return { healthy: false, reason: 'Health check did not return JSON' };
  if (!isHealthyBody(body)) {
    return { healthy: false, reason: 'Health check did not say status "ok"' };
  }
  return { healthy: true, version: body.version };
}

export async function checkHealth(
  baseUrl: string,
  fetchHealth: typeof fetch = fetch,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<HealthCheckResult> {
  try {
    const response = await fetchHealth(healthUrl(baseUrl), {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return await readHealth(response);
  } catch (error) {
    return { healthy: false, reason: failureReason(error, timeoutMs) };
  }
}
