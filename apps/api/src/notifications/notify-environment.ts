import { required } from './reminder-environment';
import type { Environment } from './reminder-environment';

export interface NotifyEnvironment {
  vapidPrivateKeyParameter: string;
  vapidPublicKey: string;
  vapidSubject: string;
}

export function readNotifyEnvironment(environment: Environment): NotifyEnvironment {
  return {
    vapidPrivateKeyParameter: required(environment, 'VAPID_PRIVATE_KEY_PARAMETER'),
    vapidPublicKey: required(environment, 'VAPID_PUBLIC_KEY'),
    vapidSubject: required(environment, 'VAPID_SUBJECT'),
  };
}
