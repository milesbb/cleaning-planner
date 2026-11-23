import { describe, expect, it, vi } from 'vitest';
import type { WebPushDevice } from '../services/notify-service';
import { createWebPushSender } from './web-push-sender';
import type { SendNotification, VapidDetails } from './web-push-sender';

const VAPID: VapidDetails = {
  subject: 'https://cleaning-planner.example',
  publicKey: 'BPublicVapidKey',
  privateKey: 'privateVapidKey',
};

const BROWSER: WebPushDevice = {
  id: 'device-1',
  addedAt: '2026-11-20T08:00:00.000Z',
  kind: 'webPush',
  subscription: {
    endpoint: 'https://fcm.googleapis.com/fcm/send/device-1',
    keys: { p256dh: 'BPublicKey', auth: 'authSecret' },
  },
};

const MESSAGE = { title: '1 job today', body: 'Wipe the hob', url: '/today/' };

function pushServiceError(statusCode: number): Error {
  return Object.assign(new Error('Received unexpected response code'), { statusCode });
}

function senderWith(sendNotification: SendNotification): ReturnType<typeof createWebPushSender> {
  return createWebPushSender({ sendNotification, loadVapidDetails: () => Promise.resolve(VAPID) });
}

describe('web push sender', () => {
  it('sends the reminder as JSON, signed with the VAPID keys, with a timeout', async () => {
    const sendNotification = vi.fn<SendNotification>(() => Promise.resolve());
    await expect(senderWith(sendNotification).sendWebPush(BROWSER, MESSAGE)).resolves.toBe('sent');
    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: BROWSER.subscription.endpoint, keys: BROWSER.subscription.keys },
      JSON.stringify(MESSAGE),
      expect.objectContaining({ vapidDetails: VAPID, timeout: 10_000, TTL: 43_200 }),
    );
  });

  it.each([404, 410])('says the browser is gone when the push service answers %i', async (code) => {
    const sendNotification = vi.fn<SendNotification>(() => Promise.reject(pushServiceError(code)));
    await expect(senderWith(sendNotification).sendWebPush(BROWSER, MESSAGE)).resolves.toBe('gone');
  });

  it('passes on any other failure', async () => {
    const failure = pushServiceError(500);
    const sendNotification = vi.fn<SendNotification>(() => Promise.reject(failure));
    await expect(senderWith(sendNotification).sendWebPush(BROWSER, MESSAGE)).rejects.toBe(failure);
  });
});
