import { z } from './zod';

const ROOT_FIELD = 'request';

export const API_ERROR_CODES = [
  'badRequest',
  'unauthorised',
  'forbidden',
  'notFound',
  'conflict',
  'tooManyRequests',
  'internal',
] as const;

export const apiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    fields: z.optional(z.record(z.string(), z.string())),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export function fieldErrorsOf(error: z.core.$ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.map(String).join('.') || ROOT_FIELD;
    fieldErrors[field] ??= issue.message;
  }
  return fieldErrors;
}
