'use client';

import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  FIELD_CLASSES,
  FIELD_LABEL_CLASSES,
  FieldMessages,
  describedByFor,
  fieldFrameClasses,
} from './field-messages';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
}

export function TextField({
  label,
  hint,
  error,
  className,
  ...inputProps
}: TextFieldProps): ReactNode {
  const inputId = useId();
  return (
    <div className={cn(FIELD_CLASSES, className)}>
      <label htmlFor={inputId} className={FIELD_LABEL_CLASSES}>
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={describedByFor(inputId, hint, error)}
        aria-invalid={error === undefined ? undefined : true}
        className={fieldFrameClasses(error !== undefined, 'px-4 outline-hidden')}
        {...inputProps}
      />
      <FieldMessages fieldId={inputId} hint={hint} error={error} />
    </div>
  );
}
