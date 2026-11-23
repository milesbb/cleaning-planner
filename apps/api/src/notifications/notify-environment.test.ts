import { describe, expect, it } from 'vitest';
import { readNotifyEnvironment } from './notify-environment';

const ENVIRONMENT = {
  VAPID_PRIVATE_KEY_PARAMETER: '/cleaning-planner/vapid-private-key',
  VAPID_PUBLIC_KEY: 'BPublicVapidKey',
  VAPID_SUBJECT: 'https://cleaning-planner.example',
};

describe('readNotifyEnvironment', () => {
  it('reads where the VAPID keys are and who sends', () => {
    expect(readNotifyEnvironment(ENVIRONMENT)).toEqual({
      vapidPrivateKeyParameter: '/cleaning-planner/vapid-private-key',
      vapidPublicKey: 'BPublicVapidKey',
      vapidSubject: 'https://cleaning-planner.example',
    });
  });

  it.each(Object.keys(ENVIRONMENT))('fails at start-up when %s is missing', (name) => {
    expect(() => readNotifyEnvironment({ ...ENVIRONMENT, [name]: '' })).toThrow(
      `${name} is not set`,
    );
  });
});
