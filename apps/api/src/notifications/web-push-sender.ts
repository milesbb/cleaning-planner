import type { PushOutcome, PushSender } from '../services/notify-service';

// A reminder is still useful later that day, but not tomorrow.
const REMINDER_TIME_TO_LIVE_SECONDS = 43_200;
const PUSH_SERVICE_TIMEOUT_MS = 10_000;
const SUBSCRIPTION_GONE = new Set([404, 410]);

export interface VapidDetails {
  subject: string;
  publicKey: string;
  privateKey: string;
}

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface SendOptions {
  vapidDetails: VapidDetails;
  TTL: number;
  timeout: number;
}

// `sendNotification` from the web-push package.
export type SendNotification = (
  subscription: PushSubscription,
  payload: string,
  options: SendOptions,
) => Promise<unknown>;

interface WebPushSenderDependencies {
  sendNotification: SendNotification;
  loadVapidDetails: () => Promise<VapidDetails>;
}

function isGone(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    SUBSCRIPTION_GONE.has(error.statusCode)
  );
}

export function createWebPushSender({
  sendNotification,
  loadVapidDetails,
}: WebPushSenderDependencies): PushSender {
  return {
    sendWebPush: async ({ subscription }, message): Promise<PushOutcome> => {
      const vapidDetails = await loadVapidDetails();
      try {
        await sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          JSON.stringify(message),
          { vapidDetails, TTL: REMINDER_TIME_TO_LIVE_SECONDS, timeout: PUSH_SERVICE_TIMEOUT_MS },
        );
        return 'sent';
      } catch (error) {
        if (isGone(error)) return 'gone';
        throw error;
      }
    },
  };
}
