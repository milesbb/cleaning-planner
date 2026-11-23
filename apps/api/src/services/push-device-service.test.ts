import type { PushDeviceRequest } from '@cleaning-planner/contracts/push-device';
import { describe, expect, it, vi } from 'vitest';
import { createPushDeviceService, deviceIdOf, MAX_PUSH_DEVICES } from './push-device-service';
import type { PushDeviceStore } from './push-device-service';

const NOW = '2026-11-23T09:15:00.000Z';

const BROWSER: PushDeviceRequest = {
  kind: 'webPush',
  subscription: {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA', auth: 'tBHItJI5svbpez7KI4CCXg' },
  },
};

const PHONE: PushDeviceRequest = { kind: 'fcm', platform: 'android', token: 'fcm-token-1' };

function storeWith(deviceIds: string[] = []): PushDeviceStore {
  return {
    listDeviceIds: vi.fn(() => Promise.resolve(deviceIds)),
    saveDevice: vi.fn(() => Promise.resolve()),
    removeDevice: vi.fn(() => Promise.resolve()),
  };
}

describe('deviceIdOf', () => {
  it('gives the same device the same id, short enough for a URL', () => {
    expect(deviceIdOf(BROWSER)).toBe(deviceIdOf({ ...BROWSER }));
    expect(deviceIdOf(BROWSER)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('gives different devices different ids', () => {
    expect(deviceIdOf(PHONE)).not.toBe(deviceIdOf({ ...PHONE, token: 'fcm-token-2' }));
    expect(deviceIdOf(PHONE)).not.toBe(deviceIdOf(BROWSER));
  });

  it('keeps the id when a browser renews its keys for the same address', () => {
    const renewed: PushDeviceRequest = {
      kind: 'webPush',
      subscription: { ...BROWSER.subscription, keys: { p256dh: 'BNew', auth: 'newAuth' } },
    };
    expect(deviceIdOf(renewed)).toBe(deviceIdOf(BROWSER));
  });
});

describe('push device service', () => {
  it('saves the device for the signed-in person and returns its id', async () => {
    const store = storeWith();
    const service = createPushDeviceService({ store, now: () => NOW });
    await expect(service.addDevice('user-sam', BROWSER)).resolves.toEqual({
      id: deviceIdOf(BROWSER),
    });
    expect(store.saveDevice).toHaveBeenCalledWith('user-sam', {
      ...BROWSER,
      id: deviceIdOf(BROWSER),
      addedAt: NOW,
    });
  });

  it('refuses a new device once the person has the most allowed', async () => {
    const store = storeWith(
      Array.from({ length: MAX_PUSH_DEVICES }, (_, index) => `d${String(index)}`),
    );
    const service = createPushDeviceService({ store, now: () => NOW });
    await expect(service.addDevice('user-sam', PHONE)).rejects.toMatchObject({ statusCode: 409 });
    expect(store.saveDevice).not.toHaveBeenCalled();
  });

  it('still updates a device the person already has when at the most allowed', async () => {
    const existing = Array.from(
      { length: MAX_PUSH_DEVICES - 1 },
      (_, index) => `d${String(index)}`,
    );
    const store = storeWith([...existing, deviceIdOf(PHONE)]);
    const service = createPushDeviceService({ store, now: () => NOW });
    await expect(service.addDevice('user-sam', PHONE)).resolves.toEqual({ id: deviceIdOf(PHONE) });
  });

  it("removes one of the signed-in person's devices", async () => {
    const store = storeWith();
    await createPushDeviceService({ store, now: () => NOW }).removeDevice('user-sam', 'device-1');
    expect(store.removeDevice).toHaveBeenCalledWith('user-sam', 'device-1');
  });
});
