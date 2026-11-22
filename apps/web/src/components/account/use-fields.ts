'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';

export type FieldErrors<Name extends string> = Partial<Record<Name, string | undefined>>;

interface BoundField {
  value: string;
  error: string | undefined;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export interface Fields<Name extends string> {
  values: Record<Name, string>;
  errors: FieldErrors<Name>;
  setErrors: (errors: FieldErrors<Name>) => void;
  bind: (name: Name) => BoundField;
}

// Values and errors for a form's text fields, ready to spread onto TextField.
export function useFields<Name extends string>(initial: Record<Name, string>): Fields<Name> {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<Name>>({});
  const bind = (name: Name): BoundField => ({
    value: values[name],
    error: errors[name],
    onChange: (event: ChangeEvent<HTMLInputElement>): void => {
      const { value } = event.target;
      setValues((current) => ({ ...current, [name]: value }));
    },
  });
  return { values, errors, setErrors, bind };
}

export function hasErrors<Name extends string>(errors: FieldErrors<Name>): boolean {
  return Object.values(errors).some((error) => error !== undefined);
}
