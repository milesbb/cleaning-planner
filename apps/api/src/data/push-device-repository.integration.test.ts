import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PushDeviceRecord } from '../services/push-device-service';
import { createPushDeviceRepository } from './push-device-repository';
import { Keys } from './table';
import { testTable } from './test-table';

const { table, create, remove } = testTable();
const devices = createPushDeviceRepository(table);

const PHONE: PushDeviceRecord = {
  id: 'device-phone',
  kind: 'fcm',
  platform: 'android',
  token: 'fcm-token-1',
  addedAt: '2026-11-23T09:15:00.000Z',
};

const BROWSER: PushDeviceRecord = {
  id: 'device-browser',
  kind: 'webPush',
  subscription: {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA', auth: 'tBHItJI5svbpez7KI4CCXg' },
  },
  addedAt: '2026-11-23T09:16:00.000Z',
};

async function storedDevice(userId: string, deviceId: string): Promise<unknown> {
  const { Item } = await table.client.send(
    new GetCommand({
      TableName: table.name,
      Key: { pk: Keys.user(userId), sk: Keys.pushDevice(deviceId) },
    }),
  );
  return Item;
}

beforeAll(create);
afterAll(remove);

describe('push device repository (DynamoDB Local)', () => {
  it('has no devices to begin with', async () => {
    await expect(devices.listDeviceIds('user-sam')).resolves.toEqual([]);
  });

  it("saves devices under the person, with each one's kind and platform", async () => {
    await devices.saveDevice('user-sam', PHONE);
    await devices.saveDevice('user-sam', BROWSER);
    await expect(devices.listDeviceIds('user-sam')).resolves.toEqual([
      'device-browser',
      'device-phone',
    ]);
    await expect(storedDevice('user-sam', 'device-phone')).resolves.toMatchObject({
      kind: 'fcm',
      platform: 'android',
      token: 'fcm-token-1',
    });
  });

  it('lists each device with everything notify needs to reach it', async () => {
    await expect(devices.listDevices('user-sam')).resolves.toEqual([BROWSER, PHONE]);
    await expect(devices.listDevices('user-nobody')).resolves.toEqual([]);
  });

  it('saving the same device again keeps one copy, with the newest details', async () => {
    await devices.saveDevice('user-sam', { ...PHONE, addedAt: '2026-11-24T07:00:00.000Z' });
    await expect(devices.listDeviceIds('user-sam')).resolves.toHaveLength(2);
    await expect(storedDevice('user-sam', 'device-phone')).resolves.toMatchObject({
      addedAt: '2026-11-24T07:00:00.000Z',
    });
  });

  it('moves a device to whoever signs in on it next', async () => {
    await devices.saveDevice('user-alex', PHONE);
    await expect(devices.listDeviceIds('user-alex')).resolves.toEqual(['device-phone']);
    await expect(devices.listDeviceIds('user-sam')).resolves.toEqual(['device-browser']);
  });

  it('removing a device someone else now has leaves theirs alone', async () => {
    await devices.removeDevice('user-sam', 'device-phone');
    await expect(devices.listDeviceIds('user-alex')).resolves.toEqual(['device-phone']);
  });

  it("removes one of the person's devices, and lets someone else claim it later", async () => {
    await devices.removeDevice('user-sam', 'device-browser');
    await expect(devices.listDeviceIds('user-sam')).resolves.toEqual([]);
    await devices.saveDevice('user-alex', BROWSER);
    await expect(devices.listDeviceIds('user-alex')).resolves.toEqual([
      'device-browser',
      'device-phone',
    ]);
  });

  it('treats removing a device that is already gone as done', async () => {
    await expect(devices.removeDevice('user-sam', 'device-unknown')).resolves.toBeUndefined();
  });
});
