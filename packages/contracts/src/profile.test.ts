import { describe, expect, it } from 'vitest';
import { profileSchema, updateProfileRequestSchema } from './profile';
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
