import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { HttpStatus } from '../utils/http-status';
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

function sendError(response: Response<ErrorBody>, statusCode: number, message: string): void {
  response.status(statusCode).json({ error: message });
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response<ErrorBody>,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    sendError(response, error.statusCode, error.message);
    return;
  }
  if (isBodyParseError(error)) {
    sendError(response, HttpStatus.badRequest, 'Malformed JSON body');
    return;
  }
  logger.error('Unhandled error', { error: describeError(error) });
  sendError(response, HttpStatus.internalServerError, 'Internal server error');
}
