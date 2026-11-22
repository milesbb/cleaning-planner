import { describe, expect, it, vi } from 'vitest';
import type { HealthCheckResult } from './check-health';
import { checkDeployment } from './check-deployment';
import type { PreflightResult } from './check-preflight';

const HEALTHY: HealthCheckResult = { healthy: true, version: 'abc123' };

function checks(
  health: HealthCheckResult,
  preflight: PreflightResult,
): {
  health: (apiUrl: string) => Promise<HealthCheckResult>;
  preflight: (apiUrl: string) => Promise<PreflightResult>;
} {
  return {
    health: vi.fn(() => Promise.resolve(health)),
    preflight: vi.fn(() => Promise.resolve(preflight)),
  };
}

describe('checkDeployment', () => {
  it('is healthy when the health check and the browser preflight both pass', async () => {
    const both = checks(HEALTHY, { passed: true });
    await expect(checkDeployment('https://api.example.com', both)).resolves.toEqual(HEALTHY);
    expect(both.preflight).toHaveBeenCalledWith('https://api.example.com');
  });

  it('is unhealthy when browsers could not call the API', async () => {
    const reason = 'Browser preflight returned HTTP 401';
    await expect(
      checkDeployment('https://api.example.com', checks(HEALTHY, { passed: false, reason })),
    ).resolves.toEqual({ healthy: false, reason });
  });

  it('reports an unhealthy API without checking the preflight', async () => {
    const unhealthy: HealthCheckResult = {
      healthy: false,
      reason: 'Health check returned HTTP 503',
    };
    const both = checks(unhealthy, { passed: true });
    await expect(checkDeployment('https://api.example.com', both)).resolves.toEqual(unhealthy);
    expect(both.preflight).not.toHaveBeenCalled();
  });
});
