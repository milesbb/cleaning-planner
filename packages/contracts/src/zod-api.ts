// The parts of zod/mini this repo uses. Exporting zod's own `z` namespace would
// keep every member alive in the web bundle, including all of zod's locales.
export {
  array,
  boolean,
  config,
  custom,
  discriminatedUnion,
  enum,
  int,
  iso,
  literal,
  maxLength,
  maximum,
  minLength,
  minimum,
  nullable,
  number,
  object,
  optional,
  record,
  refine,
  regex,
  strictObject,
  string,
  toLowerCase,
  toUpperCase,
  trim,
  undefined,
  union,
  unknown,
} from 'zod/mini';
export type { infer, ZodMiniType } from 'zod/mini';
export type * as core from 'zod/v4/core';
