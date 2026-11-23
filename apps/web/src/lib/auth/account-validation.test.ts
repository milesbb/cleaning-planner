import { describe, expect, it } from 'vitest';
import {
  codeError,
  emailError,
  existingPasswordError,
  nameError,
  newPasswordError,
} from './account-validation';

describe('account form checks', () => {
  it('needs a name', () => {
    expect(nameError('  ')).toBe('Enter your name');
    expect(nameError('Sam')).toBeUndefined();
  });

  it.each(['', 'sam', 'sam@', 'sam@example', 'sam @example.com'])(
    'rejects the email %o',
    (email) => {
      expect(emailError(email)).toBe('Enter an email address like name@example.com');
    },
  );

  it('accepts an email with spaces around it', () => {
    expect(emailError(' sam@example.com ')).toBeUndefined();
  });

  it('needs a new password of at least 12 characters', () => {
    expect(newPasswordError('short one')).toBe('Use at least 12 characters.');
    expect(newPasswordError('lemon kettle')).toBeUndefined();
  });

  it('only needs some existing password to log in', () => {
    expect(existingPasswordError('')).toBe('Enter your password');
    expect(existingPasswordError('x')).toBeUndefined();
  });

  it('needs all six digits of a code', () => {
    expect(codeError('12345')).toBe('Enter all 6 digits of the code');
    expect(codeError('123456')).toBeUndefined();
  });
});
