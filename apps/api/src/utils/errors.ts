export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  badRequest: (message: string): AppError => new AppError(400, message),
  notFound: (message = 'Not found'): AppError => new AppError(404, message),
} as const;
