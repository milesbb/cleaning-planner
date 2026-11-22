import serverlessExpress from '@codegenie/serverless-express';
import { createApp } from './app';
import { createServices } from './composition';
import { readApiGatewayClaims } from './middlewares/signed-in-user';
import { readApiGatewaySourceIp } from './middlewares/source-ip';

export const handler = serverlessExpress({
  app: createApp({
    version: process.env.APP_VERSION ?? 'unknown',
    readClaims: readApiGatewayClaims,
    readSourceIp: readApiGatewaySourceIp,
    services: createServices(process.env),
  }),
});
