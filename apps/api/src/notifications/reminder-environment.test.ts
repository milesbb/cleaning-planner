import { describe, expect, it } from 'vitest';
import { readReminderTarget } from './reminder-environment';

const ENVIRONMENT = {
  REMINDER_SCHEDULE_GROUP: 'cleaning-planner-reminders',
  REMINDER_SCHEDULE_PREFIX: 'cleaning-planner-',
  REMINDER_SCHEDULER_ROLE_ARN: 'arn:aws:iam::123456789012:role/cleaning-planner-scheduler',
  NOTIFY_FUNCTION_ARN:
    'arn:aws:lambda:ap-southeast-2:123456789012:function:cleaning-planner-notify',
};

describe('readReminderTarget', () => {
  it('reads where reminder schedules go from the environment the template sets', () => {
    expect(readReminderTarget(ENVIRONMENT)).toEqual({
      groupName: 'cleaning-planner-reminders',
      namePrefix: 'cleaning-planner-',
      schedulerRoleArn: ENVIRONMENT.REMINDER_SCHEDULER_ROLE_ARN,
      notifyFunctionArn: ENVIRONMENT.NOTIFY_FUNCTION_ARN,
    });
  });

  it.each(Object.keys(ENVIRONMENT))('fails loudly when %s is missing', (name) => {
    expect(() => readReminderTarget({ ...ENVIRONMENT, [name]: undefined })).toThrow(
      `${name} is not set`,
    );
  });

  it('treats an empty value as missing', () => {
    expect(() => readReminderTarget({ ...ENVIRONMENT, NOTIFY_FUNCTION_ARN: '' })).toThrow(
      'NOTIFY_FUNCTION_ARN is not set',
    );
  });
});
