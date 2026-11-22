import { createRequire } from 'node:module';
import process from 'node:process';

const SUCCESS_STATUS_CODE = 200;

const healthCheckEvent = {
  version: '2.0',
  routeKey: 'ANY /v1/{proxy+}',
  rawPath: '/v1/health',
  rawQueryString: '',
  headers: { host: 'localhost' },
  isBase64Encoded: false,
  requestContext: {
    http: { method: 'GET', path: '/v1/health', sourceIp: '127.0.0.1' },
    stage: '$default',
    requestId: 'smoke-test',
  },
};

const { handler } = createRequire(import.meta.url)('../dist/lambda.js');
const response = await handler(healthCheckEvent, {});

process.stdout.write(`${JSON.stringify(response)}\n`);
if (response.statusCode !== SUCCESS_STATUS_CODE) {
  process.exit(1);
}
