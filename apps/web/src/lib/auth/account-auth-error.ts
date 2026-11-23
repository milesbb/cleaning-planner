// Cognito's errors, turned into plain messages the screens can show.

export type AccountAuthFailureKind =
  | 'emailTaken'
  | 'emailInUse'
  | 'weakPassword'
  | 'wrongCode'
  | 'expiredCode'
  | 'wrongDetails'
  | 'wrongCurrentPassword'
  | 'tooManyAttempts'
  | 'offline'
  | 'unexpected';

const MESSAGES: Record<AccountAuthFailureKind, string> = {
  emailTaken:
    'There’s already an account for this email. Log in, or reset your password if you’ve forgotten it.',
  emailInUse: 'Another account already uses that email. Choose a different one.',
  weakPassword: 'Use at least 12 characters.',
  wrongCode: 'That code doesn’t match. Check the email and try again.',
  expiredCode: 'That code has expired. Send a new code and try again.',
  wrongDetails: 'That email and password don’t match. Check for typos, or reset your password.',
  wrongCurrentPassword: 'That isn’t your current password. Check for typos, or reset it.',
  tooManyAttempts: 'Too many tries for now. Wait a few minutes, then try again.',
  offline: 'Can’t reach Cleaning Planner. Check your connection and try again.',
  unexpected: 'Something went wrong. Try again.',
};

export class AccountAuthError extends Error {
  readonly kind: AccountAuthFailureKind;

  constructor(kind: AccountAuthFailureKind) {
    super(MESSAGES[kind]);
    this.name = 'AccountAuthError';
    this.kind = kind;
  }
}

const KIND_BY_COGNITO_ERROR: Record<string, AccountAuthFailureKind> = {
  UsernameExistsException: 'emailTaken',
  AliasExistsException: 'emailTaken',
  InvalidPasswordException: 'weakPassword',
  CodeMismatchException: 'wrongCode',
  ExpiredCodeException: 'expiredCode',
  NotAuthorizedException: 'wrongDetails',
  UserNotFoundException: 'wrongDetails',
  TooManyRequestsException: 'tooManyAttempts',
  LimitExceededException: 'tooManyAttempts',
  TooManyFailedAttemptsException: 'tooManyAttempts',
  NetworkError: 'offline',
};

const TOO_MANY_ATTEMPTS_MESSAGE = /attempts exceeded/i;

export function nameOf(error: unknown): string {
  return error instanceof Error ? error.name : '';
}

export function failureOf(error: unknown): AccountAuthError {
  if (error instanceof Error && TOO_MANY_ATTEMPTS_MESSAGE.test(error.message)) {
    return new AccountAuthError('tooManyAttempts');
  }
  return new AccountAuthError(KIND_BY_COGNITO_ERROR[nameOf(error)] ?? 'unexpected');
}

export async function translated<Result>(attempt: () => Promise<Result>): Promise<Result> {
  try {
    return await attempt();
  } catch (error) {
    throw failureOf(error);
  }
}
