import { logger } from '../utils/logging';
import type { HealthCheckResult } from './check-health';
import { checkDeployment } from './check-deployment';

const SUCCESS_EXIT_CODE = 0;
const FAILURE_EXIT_CODE = 1;

export async function runHealthCheck(
  apiUrl: string | undefined,
  check: (apiUrl: string) => Promise<HealthCheckResult> = checkDeployment,
): Promise<number> {
  if (apiUrl === undefined || apiUrl === '') {
    logger.error('API_URL is not set');
    return FAILURE_EXIT_CODE;
  }
  const result = await check(apiUrl);
  if (result.healthy) {
    logger.info('Deployed API is healthy', { apiUrl, version: result.version });
    return SUCCESS_EXIT_CODE;
  }
  logger.error('Deployed API is not healthy', { apiUrl, reason: result.reason });
  return FAILURE_EXIT_CODE;
}
