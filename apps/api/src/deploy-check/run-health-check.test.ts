import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { HealthCheckResult } from './check-health';
import { runHealthCheck } from './run-health-check';

function checkReturning(result: HealthCheckResult): (apiUrl: string) => Promise<HealthCheckResult> {
  return vi.fn(() => Promise.resolve(result));
}

function firstLine(writeSpy: MockInstance<typeof process.stdout.write>): string {
  return String(writeSpy.mock.calls[0]?.[0]);
}

describe('runHealthCheck', () => {
  let standardOutput: MockInstance<typeof process.stdout.write>;
  let errorOutput: MockInstance<typeof process.stderr.write>;

  beforeEach(() => {
    standardOutput = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    errorOutput = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits 0 and logs the version when the API is healthy', async () => {
    const check = checkReturning({ healthy: true, version: 'abc123' });
    await expect(runHealthCheck('https://api.example.com', check)).resolves.toBe(0);
    expect(check).toHaveBeenCalledWith('https://api.example.com');
    expect(firstLine(standardOutput)).toContain('abc123');
  });

  it('exits 1 and logs the reason when the API is not healthy', async () => {
    const check = checkReturning({ healthy: false, reason: 'Health check returned HTTP 503' });
    await expect(runHealthCheck('https://api.example.com', check)).resolves.toBe(1);
    expect(firstLine(errorOutput)).toContain('HTTP 503');
  });

  it.each([undefined, ''])('exits 1 without calling the API when API_URL is %o', async (apiUrl) => {
    const check = checkReturning({ healthy: true, version: 'abc123' });
    await expect(runHealthCheck(apiUrl, check)).resolves.toBe(1);
    expect(check).not.toHaveBeenCalled();
    expect(firstLine(errorOutput)).toContain('API_URL is not set');
  });
});
