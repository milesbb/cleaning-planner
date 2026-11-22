import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { Profile } from '@cleaning-planner/contracts/profile';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMembershipRepository } from './membership-repository';
import { createProfileRepository } from './profile-repository';
import { Keys } from './table';
import { testTable } from './test-table';

const { table, create, remove } = testTable();
const memberships = createMembershipRepository(table);
const profiles = createProfileRepository(table, memberships);

const SAM: Profile = { id: 'user-sam', name: 'Sam', email: 'sam@example.com', colour: 'blue' };

beforeAll(create);
afterAll(remove);

describe('profile repository (DynamoDB Local)', () => {
  it('has no profile before the first sign-in', async () => {
    await expect(profiles.getProfile('user-sam')).resolves.toBeNull();
  });

  it('creates a profile and reads it back', async () => {
    await expect(profiles.createProfile(SAM)).resolves.toEqual(SAM);
    await expect(profiles.getProfile('user-sam')).resolves.toEqual(SAM);
  });

  it('keeps the first profile when two first calls race', async () => {
    await expect(profiles.createProfile({ ...SAM, colour: 'pink' })).resolves.toEqual(SAM);
  });

  it("updates the profile and the person's name and colour in every home", async () => {
    await memberships.addMember({
      householdId: 'home-flat',
      householdName: 'Our flat',
      userId: 'user-sam',
      name: 'Sam',
      colour: 'blue',
      role: 'owner',
    });
    await expect(
      profiles.updateProfile('user-sam', { name: 'Sammy', colour: 'teal' }),
    ).resolves.toEqual({ ...SAM, name: 'Sammy', colour: 'teal' });
    const { Item } = await table.client.send(
      new GetCommand({
        TableName: table.name,
        Key: { pk: Keys.household('home-flat'), sk: Keys.member('user-sam') },
      }),
    );
    expect(Item).toMatchObject({ name: 'Sammy', colour: 'teal' });
  });

  it('changes only the fields asked for', async () => {
    await expect(profiles.updateProfile('user-sam', { colour: 'green' })).resolves.toMatchObject({
      name: 'Sammy',
      colour: 'green',
    });
  });

  it('cannot update a profile that was never created', async () => {
    await expect(profiles.updateProfile('user-nobody', { name: 'Nobody' })).rejects.toThrow(
      'Open the app again to set up your profile',
    );
  });
});
