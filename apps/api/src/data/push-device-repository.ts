import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { z } from '@cleaning-planner/contracts/zod';
import type { PushDeviceRecord, PushDeviceStore } from '../services/push-device-service';
import { Errors } from '../utils/errors';
import { isConditionFailure } from './conditions';
import { partitionItemKeys } from './home-items';
import type { ItemKey } from './home-items';
import { Keys } from './table';
import type { Table } from './table';

// Each device also has a claim item naming the one person it belongs to, so a
// phone or browser that someone else signs in on stops getting the last
// person's reminders.
const claimSchema = z.object({ userId: z.string() });

function deviceKey(userId: string, deviceId: string): ItemKey {
  return { pk: Keys.user(userId), sk: Keys.pushDevice(deviceId) };
}

function claimKey(deviceId: string): ItemKey {
  return { pk: Keys.deviceClaim(deviceId), sk: Keys.deviceOwner };
}

async function listDeviceIds(table: Table, userId: string): Promise<string[]> {
  const keys = await partitionItemKeys(table, Keys.user(userId), Keys.pushDevicePrefix);
  return keys.map((key) => key.sk.slice(Keys.pushDevicePrefix.length));
}

async function ownerOf(table: Table, deviceId: string): Promise<string | undefined> {
  const { Item } = await table.client.send(
    new GetCommand({ TableName: table.name, Key: claimKey(deviceId), ConsistentRead: true }),
  );
  return Item === undefined ? undefined : claimSchema.parse(Item).userId;
}

function claimFor(table: Table, deviceId: string, userId: string, previousOwner?: string): object {
  const unchangedSinceRead =
    previousOwner === undefined
      ? { ConditionExpression: 'attribute_not_exists(pk)' }
      : {
          ConditionExpression: 'userId = :previousOwner',
          ExpressionAttributeValues: { ':previousOwner': previousOwner },
        };
  return {
    Put: { TableName: table.name, Item: { ...claimKey(deviceId), userId }, ...unchangedSinceRead },
  };
}

function takeFromPreviousOwner(table: Table, deviceId: string, previousOwner: string): object {
  return { Delete: { TableName: table.name, Key: deviceKey(previousOwner, deviceId) } };
}

async function saveDevice(table: Table, userId: string, device: PushDeviceRecord): Promise<void> {
  const previousOwner = await ownerOf(table, device.id);
  const isSomeoneElses = previousOwner !== undefined && previousOwner !== userId;
  const transactItems = [
    { Put: { TableName: table.name, Item: { ...deviceKey(userId, device.id), ...device } } },
    claimFor(table, device.id, userId, previousOwner),
    ...(isSomeoneElses ? [takeFromPreviousOwner(table, device.id, previousOwner)] : []),
  ];
  try {
    await table.client.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch (error) {
    if (isConditionFailure(error)) throw Errors.conflict('This device changed. Try again.');
    throw error;
  }
}

async function releaseClaim(table: Table, userId: string, deviceId: string): Promise<void> {
  try {
    await table.client.send(
      new DeleteCommand({
        TableName: table.name,
        Key: claimKey(deviceId),
        ConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
      }),
    );
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) throw error;
  }
}

async function removeDevice(table: Table, userId: string, deviceId: string): Promise<void> {
  await table.client.send(
    new DeleteCommand({ TableName: table.name, Key: deviceKey(userId, deviceId) }),
  );
  await releaseClaim(table, userId, deviceId);
}

export function createPushDeviceRepository(table: Table): PushDeviceStore {
  return {
    listDeviceIds: (userId) => listDeviceIds(table, userId),
    saveDevice: (userId, device) => saveDevice(table, userId, device),
    removeDevice: (userId, deviceId) => removeDevice(table, userId, deviceId),
  };
}
