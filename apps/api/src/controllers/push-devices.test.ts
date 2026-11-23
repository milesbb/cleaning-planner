import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { PushDeviceService } from '../services/push-device-service';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';

const BROWSER = {
  kind: 'webPush',
  subscription: {
    endpoint: 'https://web.push.apple.com/QGk3abc',
    expirationTime: null,
    keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA', auth: 'test-auth-secret' },
  },
};

const PHONE = { kind: 'fcm', platform: 'ios', token: 'fcm-token-1' };

function pushDeviceService(): PushDeviceService {
  return {
    addDevice: vi.fn(() => Promise.resolve({ id: 'device-1' })),
    removeDevice: vi.fn(() => Promise.resolve()),
  };
}

const SIGNED_IN_AS_SAM = signedInAs('user-sam');

describe('POST /v1/me/push-devices', () => {
  it('needs a signed-in user', async () => {
    const response = await request(testApp({ pushDevices: pushDeviceService() }))
      .post('/v1/me/push-devices')
      .send(BROWSER);
    expect(response.status).toBe(401);
  });

  it.each([
    ['a browser', BROWSER],
    ['an app', PHONE],
  ])('adds %s for the signed-in person', async (_, device) => {
    const pushDevices = pushDeviceService();
    const response = await request(testApp({ pushDevices }))
      .post('/v1/me/push-devices')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM)
      .send(device);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 'device-1' });
    expect(pushDevices.addDevice).toHaveBeenCalledWith('user-sam', device);
  });

  it('refuses an address that is not a push service', async () => {
    const pushDevices = pushDeviceService();
    const response = await request(testApp({ pushDevices }))
      .post('/v1/me/push-devices')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM)
      .send({
        ...BROWSER,
        subscription: { ...BROWSER.subscription, endpoint: 'https://internal.example.com/x' },
      });
    expect(response.status).toBe(400);
    expect(pushDevices.addDevice).not.toHaveBeenCalled();
  });
});

describe('DELETE /v1/me/push-devices/:deviceId', () => {
  it('needs a signed-in user', async () => {
    const response = await request(testApp({ pushDevices: pushDeviceService() })).delete(
      '/v1/me/push-devices/device-1',
    );
    expect(response.status).toBe(401);
  });

  it("removes one of the signed-in person's devices", async () => {
    const pushDevices = pushDeviceService();
    const response = await request(testApp({ pushDevices }))
      .delete('/v1/me/push-devices/device-1')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM);
    expect(response.status).toBe(204);
    expect(pushDevices.removeDevice).toHaveBeenCalledWith('user-sam', 'device-1');
  });

  it('refuses an id that could not be a device', async () => {
    const pushDevices = pushDeviceService();
    const response = await request(testApp({ pushDevices }))
      .delete('/v1/me/push-devices/not%20an%20id')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM);
    expect(response.status).toBe(400);
    expect(pushDevices.removeDevice).not.toHaveBeenCalled();
  });
});
