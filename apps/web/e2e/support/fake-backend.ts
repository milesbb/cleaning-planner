import type { Page, Request, Route } from '@playwright/test';
import { COGNITO_URL, E2E_ENVIRONMENT } from './test-environment';

// Answers Cognito and our API inside the browser, so the signed-out flow runs
// end to end with no AWS. Each test overrides only the operations it cares about.

export interface FakeAnswer {
  status?: number;
  body: unknown;
}

type CognitoOperation =
  | 'SignUp'
  | 'ConfirmSignUp'
  | 'ResendConfirmationCode'
  | 'InitiateAuth'
  | 'RespondToAuthChallenge'
  | 'ForgotPassword'
  | 'ConfirmForgotPassword'
  | 'RevokeToken'
  | 'ChangePassword'
  | 'GlobalSignOut';

export type CognitoAnswers = Partial<Record<CognitoOperation, FakeAnswer>>;

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

const HOUR_SECONDS = 3600;

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function fakeJwt(claims: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: 'user-sam', iat: now, exp: now + HOUR_SECONDS, ...claims };
  return `${base64Url({ alg: 'RS256', kid: 'e2e' })}.${base64Url(payload)}.signature`;
}

const SIGNED_IN = {
  AuthenticationResult: {
    AccessToken: fakeJwt({ token_use: 'access', username: 'user-sam' }),
    IdToken: fakeJwt({ token_use: 'id', 'cognito:username': 'user-sam', email: 'sam@example.com' }),
    RefreshToken: 'e2e-refresh-token',
    ExpiresIn: HOUR_SECONDS,
    TokenType: 'Bearer',
  },
  ChallengeParameters: {},
};

const PASSWORD_VERIFIER = {
  ChallengeName: 'PASSWORD_VERIFIER',
  ChallengeParameters: {
    SALT: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    SECRET_BLOCK: Buffer.from('e2e-secret-block').toString('base64'),
    SRP_B: 'f'.repeat(64) + '1234567890abcdef'.repeat(28),
    USERNAME: 'user-sam',
    USER_ID_FOR_SRP: 'user-sam',
  },
};

export function cognitoError(type: string, message = type): FakeAnswer {
  return { status: 400, body: { __type: type, message } };
}

const DEFAULT_ANSWERS: Record<CognitoOperation, FakeAnswer> = {
  SignUp: { body: { UserConfirmed: false, UserSub: 'user-sam' } },
  ConfirmSignUp: { body: { Session: 'e2e-sign-in-session' } },
  ResendConfirmationCode: { body: { CodeDeliveryDetails: { DeliveryMedium: 'EMAIL' } } },
  InitiateAuth: { body: PASSWORD_VERIFIER },
  RespondToAuthChallenge: { body: SIGNED_IN },
  ForgotPassword: { body: { CodeDeliveryDetails: { DeliveryMedium: 'EMAIL' } } },
  ConfirmForgotPassword: { body: {} },
  RevokeToken: { body: {} },
  ChangePassword: { body: {} },
  GlobalSignOut: { body: {} },
};

function fulfil(route: Route, { status = 200, body }: FakeAnswer): Promise<void> {
  return route.fulfill({
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/x-amz-json-1.1' },
    body: JSON.stringify(body),
  });
}

export interface FakeBackend {
  cognitoCalls: CognitoOperation[];
}

function isOperation(name: string | undefined): name is CognitoOperation {
  return Object.keys(DEFAULT_ANSWERS).some((operation) => operation === name);
}

function operationOf(route: Route): CognitoOperation | undefined {
  const target = route.request().headers()['x-amz-target'] ?? '';
  const operation = target.split('.').pop();
  return isOperation(operation) ? operation : undefined;
}

function answerFor(route: Route, operation: CognitoOperation, answers: CognitoAnswers): FakeAnswer {
  const body: unknown = route.request().postDataJSON();
  const isSessionSignIn =
    operation === 'InitiateAuth' &&
    typeof body === 'object' &&
    body !== null &&
    'AuthFlow' in body &&
    body.AuthFlow === 'USER_AUTH';
  if (isSessionSignIn && answers.InitiateAuth === undefined) return { body: SIGNED_IN };
  return answers[operation] ?? DEFAULT_ANSWERS[operation];
}

export async function fakeCognito(page: Page, answers: CognitoAnswers = {}): Promise<FakeBackend> {
  const backend: FakeBackend = { cognitoCalls: [] };
  await page.route(COGNITO_URL, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    const operation = operationOf(route);
    if (operation === undefined) {
      await fulfil(route, cognitoError('UnsupportedOperation'));
      return;
    }
    backend.cognitoCalls.push(operation);
    await fulfil(route, answerFor(route, operation, answers));
  });
  return backend;
}

// Answers every method on `path` (a glob), or only `method` (others fall back
// to an earlier fakeApi for the same path). A function answer can keep state.
export async function fakeApi(
  page: Page,
  path: string,
  answer: FakeAnswer | ((request: Request) => FakeAnswer),
  { method }: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' } = {},
): Promise<void> {
  await page.route(`${E2E_ENVIRONMENT.NEXT_PUBLIC_API_URL}${path}`, async (route) => {
    const requestMethod = route.request().method();
    if (requestMethod === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    if (method !== undefined && requestMethod !== method) {
      await route.fallback();
      return;
    }
    const { status = 200, body } = typeof answer === 'function' ? answer(route.request()) : answer;
    await route.fulfill({
      status,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  });
}

export function asObject(value: unknown): object {
  return typeof value === 'object' && value !== null ? value : {};
}

// Load a page and wait for its scripts, so typing isn't wiped when React hydrates.
export async function openPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}
