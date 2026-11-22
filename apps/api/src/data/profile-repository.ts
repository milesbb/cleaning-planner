import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { profileSchema } from '@cleaning-planner/contracts/profile';
import type { Profile, UpdateProfileRequest } from '@cleaning-planner/contracts/profile';
import { z } from '@cleaning-planner/contracts/zod';
import type { ProfileStore } from '../services/profile-service';
import { Errors } from '../utils/errors';
import type { MembershipRepository } from './membership-repository';
import { Keys } from './table';
import type { Table } from './table';

const storedProfileSchema = z.object(profileSchema.shape);
const MAX_HOMES_PER_PERSON = 50;

function changeExpression(changes: UpdateProfileRequest): {
  UpdateExpression: string;
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, string>;
} {
  const fields = Object.entries(changes).filter(([, value]) => value !== undefined);
  return {
    UpdateExpression: `SET ${fields.map(([field]) => `#${field} = :${field}`).join(', ')}`,
    ExpressionAttributeNames: Object.fromEntries(fields.map(([field]) => [`#${field}`, field])),
    ExpressionAttributeValues: Object.fromEntries(
      fields.map(([field, value]) => [`:${field}`, String(value)]),
    ),
  };
}

async function getProfile(table: Table, userId: string): Promise<Profile | null> {
  const { Item } = await table.client.send(
    new GetCommand({
      TableName: table.name,
      Key: { pk: Keys.user(userId), sk: Keys.profile },
      ConsistentRead: true,
    }),
  );
  return Item === undefined ? null : storedProfileSchema.parse(Item);
}

async function createProfile(table: Table, profile: Profile): Promise<Profile> {
  try {
    await table.client.send(
      new PutCommand({
        TableName: table.name,
        Item: { pk: Keys.user(profile.id), sk: Keys.profile, ...profile },
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    );
    return profile;
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) throw error;
    const existing = await getProfile(table, profile.id);
    if (existing === null) throw error;
    return existing;
  }
}

async function updateProfile(
  table: Table,
  memberships: MembershipRepository,
  userId: string,
  changes: UpdateProfileRequest,
): Promise<Profile> {
  const homes = await memberships.listHomesOf(userId);
  if (homes.length > MAX_HOMES_PER_PERSON) throw Errors.conflict('You belong to too many homes');
  const expression = changeExpression(changes);
  const mustExist = 'attribute_exists(pk)';
  const profileUpdate = { Key: { pk: Keys.user(userId), sk: Keys.profile }, ...expression };
  const memberUpdates = homes.map((home) => ({
    Key: { pk: Keys.household(home.id), sk: Keys.member(userId) },
    ...expression,
  }));
  try {
    await table.client.send(
      new TransactWriteCommand({
        TransactItems: [profileUpdate, ...memberUpdates].map((update) => ({
          Update: { TableName: table.name, ConditionExpression: mustExist, ...update },
        })),
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'TransactionCanceledException') {
      throw Errors.notFound('Open the app again to set up your profile');
    }
    throw error;
  }
  const updated = await getProfile(table, userId);
  if (updated === null) throw Errors.notFound();
  return updated;
}

export function createProfileRepository(
  table: Table,
  memberships: MembershipRepository,
): ProfileStore {
  return {
    getProfile: (userId) => getProfile(table, userId),
    createProfile: (profile) => createProfile(table, profile),
    updateProfile: (userId, changes) => updateProfile(table, memberships, userId, changes),
  };
}
