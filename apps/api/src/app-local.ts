import { createApp } from './app';
import { createServices } from './composition';
import type { ClaimsReader } from './middlewares/signed-in-user';
import { logger } from './utils/logging';

const DEFAULT_LOCAL_PORT = 4000;

function localPort(): number {
  const configuredPort = Number(process.env.PORT ?? DEFAULT_LOCAL_PORT);
  if (!Number.isInteger(configuredPort) || configuredPort <= 0) {
    throw new Error(`PORT must be a positive whole number, got "${process.env.PORT ?? ''}"`);
  }
  return configuredPort;
}

const readDevelopmentClaims: ClaimsReader = (request) => {
  const userId = request.header('x-dev-user-id');
  return userId === undefined ? undefined : { sub: userId, token_use: 'access' };
};

const port = localPort();

createApp({
  version: 'local',
  readClaims: readDevelopmentClaims,
  readSourceIp: (request) => request.ip,
  services: createServices(process.env),
}).listen(port, () => {
  logger.info('API listening', { url: `http://localhost:${String(port)}` });
});
