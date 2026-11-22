import { describe, expect, it } from 'vitest';
import { apiErrorSchema } from './api-error';
import { profileSchema } from './profile';
import { describeContract, fieldErrorsFor } from './test-support';

describeContract('apiErrorSchema', apiErrorSchema, {
  valid: {
    error: {
      code: 'badRequest',
      message: 'Check the highlighted fields',
      fields: { name: 'Enter a name' },
    },
  },
  requiredField: 'error',
  wrongType: { field: 'error', value: 'Something broke' },
});

describe('fieldErrorsOf', () => {
  it('gives one message per field, joined into a dotted path', () => {
    expect(
      fieldErrorsFor(profileSchema, { id: 'user 1', name: '', email: 'nope', colour: 'blue' }),
    ).toEqual({
      id: "That id isn't valid",
      name: 'Enter a name',
      email: 'Enter an email address like name@example.com',
    });
  });

  it('keeps the first message when a field has several problems', () => {
    const errors = fieldErrorsFor(profileSchema, {
      id: 'user-1',
      name: 'Sam',
      email: 'x'.repeat(300),
      colour: 'blue',
    });
    expect(errors).toEqual({ email: 'Enter an email address like name@example.com' });
  });
});
