import { HttpStatus } from './http-status';

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  badRequest: (message: string): AppError => new AppError(HttpStatus.badRequest, message),
  notFound: (message = 'Not found'): AppError => new AppError(HttpStatus.notFound, message),
} as const;
