import type { ScheduleTarget } from './reminder-schedules';

export type Environment = Record<string, string | undefined>;

export function required(environment: Environment, name: string): string {
  const value = environment[name];
  if (value === undefined || value === '') throw new Error(`${name} is not set`);
  return value;
}

export function readReminderTarget(environment: Environment): ScheduleTarget {
  return {
    groupName: required(environment, 'REMINDER_SCHEDULE_GROUP'),
    namePrefix: required(environment, 'REMINDER_SCHEDULE_PREFIX'),
    schedulerRoleArn: required(environment, 'REMINDER_SCHEDULER_ROLE_ARN'),
    notifyFunctionArn: required(environment, 'NOTIFY_FUNCTION_ARN'),
  };
}
