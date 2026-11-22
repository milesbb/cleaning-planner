import { describe, expect, it } from 'vitest';
import { fieldErrorsOf } from './api-error';
import type { z } from './zod';

export function fieldErrorsFor(schema: z.ZodMiniType, value: unknown): Record<string, string> {
  const result = schema.safeParse(value);
  return result.success ? {} : fieldErrorsOf(result.error);
}

interface ContractExamples {
  valid: Record<string, unknown>;
  requiredField?: string;
  wrongType: { field: string; value: unknown };
}

function without(example: Record<string, unknown>, field: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(example).filter(([key]) => key !== field));
}

export function describeContract(
  name: string,
  schema: z.ZodMiniType,
  { valid, requiredField, wrongType }: ContractExamples,
): void {
  describe(`${name}: the basics`, () => {
    it('accepts a valid example', () => {
      expect(schema.safeParse(valid).success).toBe(true);
    });

    it.runIf(requiredField !== undefined)('says which required field is missing', () => {
      const field = requiredField ?? '';
      expect(fieldErrorsFor(schema, without(valid, field))).toHaveProperty([field]);
    });

    it(`says which field has the wrong type when ${wrongType.field} is wrong`, () => {
      const errors = fieldErrorsFor(schema, { ...valid, [wrongType.field]: wrongType.value });
      expect(errors).toHaveProperty([wrongType.field]);
    });

    it('rejects fields it does not know', () => {
      expect(fieldErrorsFor(schema, { ...valid, isAdmin: true })).toEqual({
        request: 'Unrecognized key: "isAdmin"',
      });
    });
  });
}
