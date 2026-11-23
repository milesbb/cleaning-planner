import { recordIdSchema } from './primitives';
import { z } from './zod';

// The browsers' push services. notify sends to the endpoint it's given, so an
// endpoint anywhere else would let a client point our function at any host.
const PUSH_SERVICE_HOSTS = [
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
];
const MAX_ENDPOINT_LENGTH = 2048;
const MAX_PUBLIC_KEY_LENGTH = 128;
const MAX_AUTH_SECRET_LENGTH = 64;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;
const FCM_TOKEN_PATTERN = /^[A-Za-z0-9:_-]{1,4096}$/;
const NOT_A_PUSH_SERVICE = "That isn't a push service address";

export const APP_PLATFORMS = ['ios', 'android'] as const;

function isPushServiceHost(hostname: string): boolean {
  return PUSH_SERVICE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function isPushServiceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && isPushServiceHost(url.hostname);
  } catch {
    return false;
  }
}

function base64UrlKey(maximumLength: number): z.ZodMiniType<string> {
  return z
    .string()
    .check(
      z.maxLength(maximumLength, "That key isn't valid"),
      z.regex(BASE64URL_PATTERN, "That key isn't valid"),
    );
}

const webPushSubscriptionSchema = z.strictObject({
  endpoint: z
    .string()
    .check(
      z.maxLength(MAX_ENDPOINT_LENGTH, NOT_A_PUSH_SERVICE),
      z.refine(isPushServiceUrl, NOT_A_PUSH_SERVICE),
    ),
  expirationTime: z.optional(z.nullable(z.number())),
  keys: z.strictObject({
    p256dh: base64UrlKey(MAX_PUBLIC_KEY_LENGTH),
    auth: base64UrlKey(MAX_AUTH_SECRET_LENGTH),
  }),
});

export const pushDeviceRequestSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('webPush'), subscription: webPushSubscriptionSchema }),
  z.strictObject({
    kind: z.literal('fcm'),
    platform: z.enum(APP_PLATFORMS),
    token: z.string().check(z.regex(FCM_TOKEN_PATTERN, "That device token isn't valid")),
  }),
]);

export const addedPushDeviceSchema = z.strictObject({ id: recordIdSchema });

export type PushDeviceRequest = z.infer<typeof pushDeviceRequestSchema>;
export type AddedPushDevice = z.infer<typeof addedPushDeviceSchema>;
