import {
  ConflictException,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ResourceNotFoundException,
  UpdateScheduleCommand,
} from '@aws-sdk/client-scheduler';
import type { CreateScheduleCommandInput } from '@aws-sdk/client-scheduler';
import type { ReminderEvent } from '@cleaning-planner/contracts/reminders';
import type {
  ReminderScheduler,
  ReminderTiming,
  ScheduledReminder,
} from '../services/reminder-service';

export type ScheduleCommand = CreateScheduleCommand | UpdateScheduleCommand | DeleteScheduleCommand;

interface SchedulerClient {
  send: (command: ScheduleCommand) => Promise<unknown>;
}

export interface ScheduleTarget {
  groupName: string;
  namePrefix: string;
  notifyFunctionArn: string;
  schedulerRoleArn: string;
}

// Scheduler tries again for up to an hour; a reminder later than that is no use.
const RETRY_POLICY = { MaximumRetryAttempts: 3, MaximumEventAgeInSeconds: 3600 };

function scheduleName(target: ScheduleTarget, userId: string, reminder: ScheduledReminder): string {
  return `${target.namePrefix}${userId}-${reminder}`;
}

function scheduleInput(
  target: ScheduleTarget,
  userId: string,
  reminder: ScheduledReminder,
  timing: ReminderTiming,
): CreateScheduleCommandInput {
  const event: ReminderEvent = { userId, reminder };
  return {
    Name: scheduleName(target, userId, reminder),
    GroupName: target.groupName,
    ScheduleExpression: timing.expression,
    ScheduleExpressionTimezone: timing.timeZone,
    FlexibleTimeWindow: { Mode: 'OFF' },
    State: 'ENABLED',
    Target: {
      Arn: target.notifyFunctionArn,
      RoleArn: target.schedulerRoleArn,
      Input: JSON.stringify(event),
      RetryPolicy: RETRY_POLICY,
    },
  };
}

async function createOrUpdate(
  client: SchedulerClient,
  input: CreateScheduleCommandInput,
): Promise<void> {
  try {
    await client.send(new CreateScheduleCommand(input));
  } catch (error) {
    if (!(error instanceof ConflictException)) throw error;
    await client.send(new UpdateScheduleCommand(input));
  }
}

async function saveSchedule(
  client: SchedulerClient,
  input: CreateScheduleCommandInput,
): Promise<void> {
  try {
    await client.send(new UpdateScheduleCommand(input));
  } catch (error) {
    if (!(error instanceof ResourceNotFoundException)) throw error;
    await createOrUpdate(client, input);
  }
}

async function deleteSchedule(
  client: SchedulerClient,
  target: ScheduleTarget,
  name: string,
): Promise<void> {
  try {
    await client.send(new DeleteScheduleCommand({ Name: name, GroupName: target.groupName }));
  } catch (error) {
    if (!(error instanceof ResourceNotFoundException)) throw error;
  }
}

export function createReminderSchedules(
  client: SchedulerClient,
  target: ScheduleTarget,
): ReminderScheduler {
  return {
    saveSchedule: (userId, reminder, timing) =>
      saveSchedule(client, scheduleInput(target, userId, reminder, timing)),
    deleteSchedule: (userId, reminder) =>
      deleteSchedule(client, target, scheduleName(target, userId, reminder)),
  };
}
