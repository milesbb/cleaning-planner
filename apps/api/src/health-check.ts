import { runHealthCheck } from './deploy-check/run-health-check';

process.exitCode = await runHealthCheck(process.env.API_URL);
