import { z } from '@cleaning-planner/contracts/zod';
import { getCurrentInvoke } from '@codegenie/serverless-express';
import type { Request } from 'express';

export type SourceIpReader = (request: Request) => string | undefined;

const invokeSchema = z.object({
  event: z.object({
    requestContext: z.object({ http: z.object({ sourceIp: z.string() }) }),
  }),
});

export const readApiGatewaySourceIp: SourceIpReader = () => {
  const invoke: unknown = getCurrentInvoke();
  return invokeSchema.safeParse(invoke).data?.event.requestContext.http.sourceIp;
};
