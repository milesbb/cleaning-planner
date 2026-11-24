import type { Request } from 'express';
import { Errors } from '../utils/errors';

const BEARER_PREFIX = /^Bearer\s+/i;

export function accessTokenOf(request: Request): string {
  const token = request.header('authorization')?.replace(BEARER_PREFIX, '').trim();
  if (token === undefined || token === '') throw Errors.unauthorised();
  return token;
}
