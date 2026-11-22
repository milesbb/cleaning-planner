import { createApp } from './app';
import { logger } from './utils/logging';

const port = Number(process.env.PORT ?? 4000);

createApp({ version: 'local' }).listen(port, () => {
  logger.info('API listening', { url: `http://localhost:${String(port)}` });
});
