import type { AddedPushDevice, PushDeviceRequest } from '@cleaning-planner/contracts/push-device';
import { createHash } from 'node:crypto';
import { Errors } from '../utils/errors';

export const MAX_PUSH_DEVICES = 20;

export type PushDeviceRecord = PushDeviceRequest & { id: string; addedAt: string };

export interface PushDeviceStore {
  listDeviceIds: (userId: string) => Promise<string[]>;
  saveDevice: (userId: string, device: PushDeviceRecord) => Promise<void>;
  removeDevice: (userId: string, deviceId: string) => Promise<void>;
}

export interface PushDeviceService {
  addDevice: (userId: string, device: PushDeviceRequest) => Promise<AddedPushDevice>;
  removeDevice: (userId: string, deviceId: string) => Promise<void>;
}

export interface PushDeviceDependencies {
  store: PushDeviceStore;
  now: () => string;
}

function addressOf(device: PushDeviceRequest): string {
  return device.kind === 'webPush' ? device.subscription.endpoint : device.token;
}

// A device is its push address: a browser that renews its keys stays the same device.
export function deviceIdOf(device: PushDeviceRequest): string {
  return createHash('sha256')
    .update(`${device.kind}\n${addressOf(device)}`)
    .digest('base64url');
}

async function addDevice(
  { store, now }: PushDeviceDependencies,
  userId: string,
  device: PushDeviceRequest,
): Promise<AddedPushDevice> {
  const id = deviceIdOf(device);
  const deviceIds = await store.listDeviceIds(userId);
  if (!deviceIds.includes(id) && deviceIds.length >= MAX_PUSH_DEVICES) {
    throw Errors.conflict('Turn reminders off on a device you no longer use first');
  }
  await store.saveDevice(userId, { ...device, id, addedAt: now() });
  return { id };
}

export function createPushDeviceService(dependencies: PushDeviceDependencies): PushDeviceService {
  return {
    addDevice: (userId, device) => addDevice(dependencies, userId, device),
    removeDevice: (userId, deviceId) => dependencies.store.removeDevice(userId, deviceId),
  };
}
