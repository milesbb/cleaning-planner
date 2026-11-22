import { fieldErrorsOf } from '@cleaning-planner/contracts/api-error';
import type { z } from '@cleaning-planner/contracts/zod';
import { Errors } from './errors';

export function parseOrThrow<Schema extends z.ZodMiniType>(
  schema: Schema,
  value: unknown,
): z.infer<Schema> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw Errors.badRequest('Check the highlighted fields', fieldErrorsOf(result.error));
  }
  return result.data;
}
