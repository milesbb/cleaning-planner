import serverlessExpress from '@codegenie/serverless-express';
import { createApp } from './app';
import { readApiGatewayClaims } from './middlewares/signed-in-user';

export const handler = serverlessExpress({
  app: createApp({
    version: process.env.APP_VERSION ?? 'unknown',
    readClaims: readApiGatewayClaims,
  }),
});
