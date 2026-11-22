import { checkHealth, type HealthCheckResult } from './check-health';
import { checkPreflight, type PreflightResult } from './check-preflight';

export interface DeploymentChecks {
  health: (apiUrl: string) => Promise<HealthCheckResult>;
  preflight: (apiUrl: string) => Promise<PreflightResult>;
}

const LIVE_CHECKS: DeploymentChecks = {
  health: (apiUrl) => checkHealth(apiUrl),
  preflight: (apiUrl) => checkPreflight(apiUrl),
};

export async function checkDeployment(
  apiUrl: string,
  checks: DeploymentChecks = LIVE_CHECKS,
): Promise<HealthCheckResult> {
  const health = await checks.health(apiUrl);
  if (!health.healthy) return health;
  const preflight = await checks.preflight(apiUrl);
  return preflight.passed ? health : { healthy: false, reason: preflight.reason };
}
