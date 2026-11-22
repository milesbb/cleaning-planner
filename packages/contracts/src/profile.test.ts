import { describe, expect, it } from 'vitest';
import { deleteAccountRequestSchema, profileSchema, updateProfileRequestSchema } from './profile';
import { describeContract, fieldErrorsFor } from './test-support';

describeContract('profileSchema', profileSchema, {
  valid: { id: 'user-1', name: 'Sam', email: 'sam@example.com', colour: 'blue' },
  requiredField: 'email',
  wrongType: { field: 'colour', value: 'purple' },
});

describeContract('updateProfileRequestSchema', updateProfileRequestSchema, {
  valid: { name: 'Sam', colour: 'pink' },
  wrongType: { field: 'name', value: 7 },
});

describe('updateProfileRequestSchema', () => {
  it('needs at least one thing to change', () => {
    expect(fieldErrorsFor(updateProfileRequestSchema, {})).toEqual({
      request: 'Change at least one thing',
    });
  });

  it('accepts a change to just the colour', () => {
    expect(updateProfileRequestSchema.parse({ colour: 'teal' })).toEqual({ colour: 'teal' });
  });
});

describeContract('deleteAccountRequestSchema', deleteAccountRequestSchema, {
  valid: {
    ownedHomes: [
      { householdId: 'home-1', action: 'handOver', newOwnerId: 'user-alex' },
      { householdId: 'home-2', action: 'delete' },
    ],
  },
  requiredField: 'ownedHomes',
  wrongType: { field: 'ownedHomes', value: 'all of them' },
});

describe('deleteAccountRequestSchema', () => {
  it('needs someone to hand a home over to', () => {
    expect(
      deleteAccountRequestSchema.safeParse({
        ownedHomes: [{ householdId: 'home-1', action: 'handOver' }],
      }).success,
    ).toBe(false);
  });

  it('takes one choice per home', () => {
    expect(
      fieldErrorsFor(deleteAccountRequestSchema, {
        ownedHomes: [
          { householdId: 'home-1', action: 'delete' },
          { householdId: 'home-1', action: 'handOver', newOwnerId: 'user-alex' },
        ],
      }),
    ).toEqual({ ownedHomes: 'Choose once for each home' });
  });
});
