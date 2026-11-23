import {
  ConflictException,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ResourceNotFoundException,
  UpdateScheduleCommand,
} from '@aws-sdk/client-scheduler';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createReminderSchedules } from './reminder-schedules';
import type { ScheduleCommand } from './reminder-schedules';

type Send = (command: ScheduleCommand) => Promise<unknown>;

const TARGET = {
  groupName: 'cleaning-planner-reminders',
  namePrefix: 'cleaning-planner-',
  notifyFunctionArn: 'arn:aws:lambda:ap-southeast-2:123456789012:function:cleaning-planner-notify',
  schedulerRoleArn: 'arn:aws:iam::123456789012:role/cleaning-planner-ReminderSchedulerRole-ABC',
};

const DAILY_AT_EIGHT = { expression: 'cron(0 8 * * ? *)', timeZone: 'Europe/London' };

const notFound = new ResourceNotFoundException({
  message: 'Schedule not found',
  Message: 'Schedule not found',
  $metadata: {},
});
const alreadyExists = new ConflictException({
  message: 'Schedule exists',
  Message: 'Schedule exists',
  $metadata: {},
});

function clientAnswering(...answers: (Error | undefined)[]): { send: Mock<Send> } {
  const send = vi.fn<Send>();
  for (const answer of answers) {
    send.mockImplementationOnce(() =>
      answer === undefined ? Promise.resolve({}) : Promise.reject(answer),
    );
  }
  return { send };
}

function sentCommands(client: { send: Mock<Send> }): ScheduleCommand[] {
  return client.send.mock.calls.map(([command]) => command);
}

describe('reminder schedules', () => {
  it("replaces the person's schedule when it already exists", async () => {
    const client = clientAnswering(undefined);
    await createReminderSchedules(client, TARGET).saveSchedule('user-sam', 'daily', DAILY_AT_EIGHT);
    const [command] = sentCommands(client);
    expect(command).toBeInstanceOf(UpdateScheduleCommand);
    expect(command?.input).toEqual({
      Name: 'cleaning-planner-user-sam-daily',
      GroupName: 'cleaning-planner-reminders',
      ScheduleExpression: 'cron(0 8 * * ? *)',
      ScheduleExpressionTimezone: 'Europe/London',
      FlexibleTimeWindow: { Mode: 'OFF' },
      State: 'ENABLED',
      Target: {
        Arn: TARGET.notifyFunctionArn,
        RoleArn: TARGET.schedulerRoleArn,
        Input: JSON.stringify({ userId: 'user-sam', reminder: 'daily' }),
        RetryPolicy: { MaximumRetryAttempts: 3, MaximumEventAgeInSeconds: 3600 },
      },
    });
  });

  it('creates the schedule the first time', async () => {
    const client = clientAnswering(notFound, undefined);
    await createReminderSchedules(client, TARGET).saveSchedule('user-sam', 'weekly', {
      expression: 'cron(30 18 ? * SUN *)',
      timeZone: 'UTC',
    });
    const [update, create] = sentCommands(client);
    expect(update).toBeInstanceOf(UpdateScheduleCommand);
    expect(create).toBeInstanceOf(CreateScheduleCommand);
    expect(create?.input).toMatchObject({
      Name: 'cleaning-planner-user-sam-weekly',
      ScheduleExpression: 'cron(30 18 ? * SUN *)',
    });
  });

  it('updates instead when another request created it first', async () => {
    const client = clientAnswering(notFound, alreadyExists, undefined);
    await createReminderSchedules(client, TARGET).saveSchedule('user-sam', 'daily', DAILY_AT_EIGHT);
    expect(sentCommands(client).map((command) => command.constructor)).toEqual([
      UpdateScheduleCommand,
      CreateScheduleCommand,
      UpdateScheduleCommand,
    ]);
  });

  it('passes on any other failure', async () => {
    const broken = new Error('Scheduler is down');
    const client = clientAnswering(broken);
    await expect(
      createReminderSchedules(client, TARGET).saveSchedule('user-sam', 'daily', DAILY_AT_EIGHT),
    ).rejects.toBe(broken);
  });

  it('passes on a failure to create', async () => {
    const broken = new Error('Scheduler is down');
    const client = clientAnswering(notFound, broken);
    await expect(
      createReminderSchedules(client, TARGET).saveSchedule('user-sam', 'daily', DAILY_AT_EIGHT),
    ).rejects.toBe(broken);
  });

  it("deletes the person's schedule", async () => {
    const client = clientAnswering(undefined);
    await createReminderSchedules(client, TARGET).deleteSchedule('user-sam', 'weekly');
    const [command] = sentCommands(client);
    expect(command).toBeInstanceOf(DeleteScheduleCommand);
    expect(command?.input).toEqual({
      Name: 'cleaning-planner-user-sam-weekly',
      GroupName: 'cleaning-planner-reminders',
    });
  });

  it('treats deleting a schedule that is already gone as done', async () => {
    const client = clientAnswering(notFound);
    await expect(
      createReminderSchedules(client, TARGET).deleteSchedule('user-sam', 'daily'),
    ).resolves.toBeUndefined();
  });

  it('passes on any other failure to delete', async () => {
    const broken = new Error('Scheduler is down');
    const client = clientAnswering(broken);
    await expect(
      createReminderSchedules(client, TARGET).deleteSchedule('user-sam', 'daily'),
    ).rejects.toBe(broken);
  });
});
