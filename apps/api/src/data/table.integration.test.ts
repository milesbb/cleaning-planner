import { describe, expect, it } from 'vitest';
import { createMembershipRepository } from './membership-repository';
import { connectToTable } from './table';

describe('connectToTable', () => {
  it.each([undefined, ''])('refuses to start without a table name (%j)', (tableName) => {
    expect(() => connectToTable({ TABLE_NAME: tableName })).toThrow('TABLE_NAME is not set');
  });

  it('uses the normal AWS connection when no local endpoint is given', () => {
    const table = connectToTable({ TABLE_NAME: 'cleaning-planner-data' });
    expect(table.name).toBe('cleaning-planner-data');
  });

  it('passes on errors that are not about a condition, such as a missing table', async () => {
    const memberships = createMembershipRepository(
      connectToTable({
        TABLE_NAME: 'no-such-table',
        DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT,
      }),
    );
    await expect(
      memberships.addMember({
        householdId: 'home-1',
        householdName: 'Home',
        userId: 'user-1',
        name: 'Sam',
        colour: 'blue',
        role: 'owner',
      }),
    ).rejects.toThrow(/no-such-table|not found|ResourceNotFound/i);
  });
});
