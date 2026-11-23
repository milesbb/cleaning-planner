import { describe, expect, it } from 'vitest';
import { addedPushDeviceSchema, pushDeviceRequestSchema } from './push-device';
import { describeContract, fieldErrorsFor } from './test-support';

const P256DH =
  'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM';
const AUTH = 'tBHItJI5svbpez7KI4CCXg';

const WEB_PUSH = {
  kind: 'webPush',
  subscription: {
    endpoint: 'https://fcm.googleapis.com/fcm/send/dpH5lCsTSSM:APA91bHqjZxM',
    expirationTime: null,
    keys: { p256dh: P256DH, auth: AUTH },
  },
};

const APP_PUSH = { kind: 'fcm', platform: 'ios', token: 'fcm-token:APA91bE_x-1' };

describeContract('pushDeviceRequestSchema (Web Push)', pushDeviceRequestSchema, {
  valid: WEB_PUSH,
  requiredField: 'subscription',
  wrongType: { field: 'subscription', value: 'not an object' },
});

describeContract('pushDeviceRequestSchema (app)', pushDeviceRequestSchema, {
  valid: APP_PUSH,
  requiredField: 'token',
  wrongType: { field: 'platform', value: 'windows' },
});

function withEndpoint(endpoint: string): object {
  return { ...WEB_PUSH, subscription: { ...WEB_PUSH.subscription, endpoint } };
}

describe('pushDeviceRequestSchema', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QGk3abc',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
  ])('accepts a subscription from a browser push service: %s', (endpoint) => {
    expect(pushDeviceRequestSchema.safeParse(withEndpoint(endpoint)).success).toBe(true);
  });

  it.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://fcm.googleapis.com.example.com/send',
    'https://evilfcm.googleapis.com.attacker.test/x',
    'https://internal.example.com/push',
    'not a url',
  ])('rejects an endpoint that is not a browser push service: %s', (endpoint) => {
    expect(fieldErrorsFor(pushDeviceRequestSchema, withEndpoint(endpoint))).toEqual({
      'subscription.endpoint': "That isn't a push service address",
    });
  });

  it('accepts a subscription without an expiry time', () => {
    const withoutExpiry = {
      endpoint: WEB_PUSH.subscription.endpoint,
      keys: WEB_PUSH.subscription.keys,
    };
    expect(
      pushDeviceRequestSchema.safeParse({ ...WEB_PUSH, subscription: withoutExpiry }).success,
    ).toBe(true);
  });

  it('rejects keys that are not base64url', () => {
    const subscription = { ...WEB_PUSH.subscription, keys: { p256dh: P256DH, auth: 'not/valid!' } };
    expect(fieldErrorsFor(pushDeviceRequestSchema, { ...WEB_PUSH, subscription })).toHaveProperty([
      'subscription.keys.auth',
    ]);
  });

  it('rejects an app token with characters FCM never uses', () => {
    expect(
      fieldErrorsFor(pushDeviceRequestSchema, { ...APP_PUSH, token: 'token with spaces' }),
    ).toHaveProperty(['token']);
  });

  it('rejects an app token that is far too long', () => {
    expect(
      fieldErrorsFor(pushDeviceRequestSchema, { ...APP_PUSH, token: 'a'.repeat(4097) }),
    ).toHaveProperty(['token']);
  });
});

describeContract('addedPushDeviceSchema', addedPushDeviceSchema, {
  valid: { id: 'Xk3_a-9' },
  requiredField: 'id',
  wrongType: { field: 'id', value: 'has spaces' },
});
