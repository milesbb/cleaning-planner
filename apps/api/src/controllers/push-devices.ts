import { recordIdSchema } from '@cleaning-planner/contracts/primitives';
import { pushDeviceRequestSchema } from '@cleaning-planner/contracts/push-device';
import { Router } from 'express';
import { signedInUserOf } from '../middlewares/signed-in-user';
import type { PushDeviceService } from '../services/push-device-service';
import { HttpStatus } from '../utils/http-status';
import { parseOrThrow } from '../utils/validation';

export function pushDevicesRouter(pushDevices: PushDeviceService): Router {
  const router = Router();
  router.post('/', async (request, response) => {
    const { userId } = signedInUserOf(response);
    const device = parseOrThrow(pushDeviceRequestSchema, request.body);
    response.status(HttpStatus.created).json(await pushDevices.addDevice(userId, device));
  });
  router.delete('/:deviceId', async (request, response) => {
    const { userId } = signedInUserOf(response);
    const deviceId = parseOrThrow(recordIdSchema, request.params.deviceId);
    await pushDevices.removeDevice(userId, deviceId);
    response.status(HttpStatus.noContent).end();
  });
  return router;
}
