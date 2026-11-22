import type { ApiError } from '@cleaning-planner/contracts/api-error';
import { HttpStatus } from './http-status';

type ApiErrorCode = ApiError['error']['code'];
type FieldErrors = Record<string, string>;

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly fields?: FieldErrors,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  badRequest: (message: string, fields?: FieldErrors): AppError =>
    new AppError(HttpStatus.badRequest, 'badRequest', message, fields),
  unauthorised: (): AppError =>
    new AppError(HttpStatus.unauthorised, 'unauthorised', 'Sign in to continue'),
  forbidden: (message = "You don't have access to that"): AppError =>
    new AppError(HttpStatus.forbidden, 'forbidden', message),
  notFound: (message = 'Not found'): AppError =>
    new AppError(HttpStatus.notFound, 'notFound', message),
  conflict: (message: string): AppError => new AppError(HttpStatus.conflict, 'conflict', message),
  gone: (message: string): AppError => new AppError(HttpStatus.gone, 'gone', message),
  tooManyRequests: (message: string): AppError =>
    new AppError(HttpStatus.tooManyRequests, 'tooManyRequests', message),
} as const;
