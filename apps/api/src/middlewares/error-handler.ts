import type { ApiError } from '@cleaning-planner/contracts/api-error';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { HttpStatus } from '../utils/http-status';
import { logger } from '../utils/logging';

function isBodyParseError(error: unknown): boolean {
  return error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed';
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function bodyFor(error: unknown): { statusCode: number; body: ApiError } {
  if (error instanceof AppError) {
    const fields = error.fields === undefined ? {} : { fields: error.fields };
    return {
      statusCode: error.statusCode,
      body: { error: { code: error.code, message: error.message, ...fields } },
    };
  }
  if (isBodyParseError(error)) {
    return {
      statusCode: HttpStatus.badRequest,
      body: { error: { code: 'badRequest', message: 'Malformed JSON body' } },
    };
  }
  logger.error('Unhandled error', { error: describeError(error) });
  return {
    statusCode: HttpStatus.internalServerError,
    body: { error: { code: 'internal', message: 'Something went wrong. Try again.' } },
  };
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response<ApiError>,
  _next: NextFunction,
): void {
  const { statusCode, body } = bodyFor(error);
  response.status(statusCode).json(body);
}
