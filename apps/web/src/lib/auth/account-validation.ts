// Checks run before anything goes to Cognito. Cognito checks again.

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MINIMUM_PASSWORD_LENGTH = 12;
const CODE_SHAPE = /^\d{6}$/;

export function nameError(name: string): string | undefined {
  return name.trim() === '' ? 'Enter your name' : undefined;
}

export function emailError(email: string): string | undefined {
  return EMAIL_SHAPE.test(email.trim())
    ? undefined
    : 'Enter an email address like name@example.com';
}

export function newPasswordError(password: string): string | undefined {
  return password.length >= MINIMUM_PASSWORD_LENGTH ? undefined : 'Use at least 12 characters.';
}

export function existingPasswordError(password: string): string | undefined {
  return password === '' ? 'Enter your password' : undefined;
}

export function codeError(code: string): string | undefined {
  return CODE_SHAPE.test(code) ? undefined : 'Enter all 6 digits of the code';
}
