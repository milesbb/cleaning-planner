import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logging';

interface ErrorBody {
  error: string;
}

function isBodyParseError(error: unknown): boolean {
  return error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed';
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response<ErrorBody>,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  if (isBodyParseError(error)) {
    response.status(400).json({ error: 'Malformed JSON body' });
    return;
  }
  logger.error('Unhandled error', { error: describeError(error) });
  response.status(500).json({ error: 'Internal server error' });
}
