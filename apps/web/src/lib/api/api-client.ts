import { apiErrorSchema } from '@cleaning-planner/contracts/api-error';
import type { ApiError } from '@cleaning-planner/contracts/api-error';
import { z } from '@cleaning-planner/contracts/zod';

const DEFAULT_TIMEOUT_MS = 15_000;
const API_PATH_PREFIX = '/v1/';
const HTTP_NO_CONTENT = 204;
const HTTP_UNAUTHORISED = 401;
const FIRST_SERVER_ERROR = 500;

export const NO_CONTENT = z.undefined();

const timeoutErrorSchema = z.object({ name: z.literal('TimeoutError') });

export type ApiFailureKind =
  'signedOut' | 'rejected' | 'unavailable' | 'offline' | 'timeout' | 'unexpected';

const MESSAGES = {
  signedOut: 'Sign in to continue',
  unavailable: 'Something went wrong on our side. Try again in a moment.',
  offline: 'Can’t reach Cleaning Planner. Check your connection and try again.',
  timeout: 'That took too long. Try again.',
  unexpected: 'Something went wrong. Try again.',
} as const satisfies Partial<Record<ApiFailureKind, string>>;

type ApiErrorDetails = ApiError['error'];

export class ApiRequestError extends Error {
  readonly kind: ApiFailureKind;
  readonly status: number | null;
  readonly code: ApiErrorDetails['code'] | null;
  readonly fields: Record<string, string>;

  constructor(
    kind: ApiFailureKind,
    message: string,
    { status = null, code = null, fields = {} }: Partial<Omit<ApiRequestError, 'kind'>> = {},
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface ApiRequest<Result> {
  method: HttpMethod;
  path: string;
  body?: unknown;
  response: z.ZodMiniType<Result>;
}

export interface ApiClient {
  request: <Result>(request: ApiRequest<Result>) => Promise<Result>;
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}

function failureFromNetwork(error: unknown): ApiRequestError {
  if (timeoutErrorSchema.safeParse(error).success) {
    return new ApiRequestError('timeout', MESSAGES.timeout);
  }
  return new ApiRequestError('offline', MESSAGES.offline);
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === HTTP_NO_CONTENT) return undefined;
  const text = await response.text();
  if (text === '') return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch {
    return text;
  }
}

function failureFromResponse(status: number, body: unknown): ApiRequestError {
  if (status === HTTP_UNAUTHORISED) {
    return new ApiRequestError('signedOut', MESSAGES.signedOut, { status });
  }
  const apiError = apiErrorSchema.safeParse(body);
  if (status >= FIRST_SERVER_ERROR || !apiError.success) {
    return new ApiRequestError('unavailable', MESSAGES.unavailable, { status });
  }
  const { code, message, fields = {} } = apiError.data.error;
  return new ApiRequestError('rejected', message, { status, code, fields });
}

function requestInit(
  method: HttpMethod,
  token: string,
  body: unknown,
  timeoutMs: number,
): RequestInit {
  const headers = new Headers({ Authorization: `Bearer ${token}`, Accept: 'application/json' });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  return {
    method,
    headers,
    signal: AbortSignal.timeout(timeoutMs),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

async function send(
  options: ApiClientOptions,
  { method, path, body }: ApiRequest<unknown>,
): Promise<Response> {
  if (!path.startsWith(API_PATH_PREFIX)) throw new Error('API paths start with /v1/');
  const token = await options.getAccessToken();
  if (token === null) throw new ApiRequestError('signedOut', MESSAGES.signedOut);
  const fetchImplementation = options.fetchImplementation ?? fetch;
  try {
    return await fetchImplementation(
      `${options.baseUrl}${path}`,
      requestInit(method, token, body, options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    );
  } catch (error) {
    throw failureFromNetwork(error);
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return {
    request: async <Result>(request: ApiRequest<Result>): Promise<Result> => {
      const response = await send(options, request);
      const body = await readJson(response).catch((error: unknown) => {
        throw failureFromNetwork(error);
      });
      if (!response.ok) throw failureFromResponse(response.status, body);
      const parsed = request.response.safeParse(body);
      if (!parsed.success) throw new ApiRequestError('unexpected', MESSAGES.unexpected);
      return parsed.data;
    },
  };
}
