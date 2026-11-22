import { createApp } from './app';
import { logger } from './utils/logging';

const DEFAULT_LOCAL_PORT = 4000;

function localPort(): number {
  const configuredPort = Number(process.env.PORT ?? DEFAULT_LOCAL_PORT);
  if (!Number.isInteger(configuredPort) || configuredPort <= 0) {
    throw new Error(`PORT must be a positive whole number, got "${process.env.PORT ?? ''}"`);
  }
  return configuredPort;
}

const port = localPort();

createApp({ version: 'local' }).listen(port, () => {
  logger.info('API listening', { url: `http://localhost:${String(port)}` });
});
