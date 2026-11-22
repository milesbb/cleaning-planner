'use client';

import { useId, useState } from 'react';
import type { ChangeEvent, ChangeEventHandler, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EyeIcon, EyeOffIcon } from '../icons/interface-icons';
import {
  FIELD_CLASSES,
  FIELD_LABEL_CLASSES,
  FieldMessages,
  describedByFor,
  fieldFrameClasses,
} from './field-messages';

type PasswordPurpose = 'new-password' | 'current-password';

interface PasswordFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'type' | 'className' | 'autoComplete' | 'value'
> {
  label: string;
  autoComplete: PasswordPurpose;
  value?: string;
  minimumLength?: number;
  error?: string;
  className?: string;
}

function lengthHint(minimumLength: number | undefined, length: number): string | undefined {
  if (minimumLength === undefined) return undefined;
  if (length === 0) return `At least ${String(minimumLength)} characters.`;
  if (length >= minimumLength) return `${String(length)} characters. Long enough.`;
  const remaining = minimumLength - length;
  const characters = remaining === 1 ? 'character' : 'characters';
  return `${String(remaining)} more ${characters} to go. At least ${String(minimumLength)} in total.`;
}

interface PasswordLength {
  length: number;
  handleChange: ChangeEventHandler<HTMLInputElement>;
}

function usePasswordLength(
  value: string | undefined,
  onChange: ChangeEventHandler<HTMLInputElement> | undefined,
): PasswordLength {
  const [typedLength, setTypedLength] = useState(0);
  return {
    length: value?.length ?? typedLength,
    handleChange: (event: ChangeEvent<HTMLInputElement>): void => {
      setTypedLength(event.target.value.length);
      onChange?.(event);
    },
  };
}

interface VisibilityToggleProps {
  isVisible: boolean;
  onToggle: (isVisible: boolean) => void;
}

function VisibilityToggle({ isVisible, onToggle }: VisibilityToggleProps): ReactNode {
  return (
    <button
      type="button"
      aria-pressed={isVisible}
      aria-label={isVisible ? 'Hide password' : 'Show password'}
      onClick={() => {
        onToggle(!isVisible);
      }}
      className="flex w-13 shrink-0 items-center justify-center rounded-r-[calc(var(--radius-control)-2px)] border-l-2 border-ink focus-visible:bg-kitchen focus-visible:outline-hidden"
    >
      {isVisible ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

export function PasswordField({
  label,
  error,
  minimumLength,
  className,
  value,
  onChange,
  ...inputProps
}: PasswordFieldProps): ReactNode {
  const inputId = useId();
  const [isVisible, setIsVisible] = useState(false);
  const { length, handleChange } = usePasswordLength(value, onChange);
  const hint = error === undefined ? lengthHint(minimumLength, length) : undefined;
  return (
    <div className={cn(FIELD_CLASSES, className)}>
      <label htmlFor={inputId} className={FIELD_LABEL_CLASSES}>
        {label}
      </label>
      <div className={fieldFrameClasses(error !== undefined, 'flex items-stretch')}>
        <input
          id={inputId}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          aria-describedby={describedByFor(inputId, hint, error)}
          aria-invalid={error === undefined ? undefined : true}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent px-4 outline-hidden"
          {...inputProps}
        />
        <VisibilityToggle isVisible={isVisible} onToggle={setIsVisible} />
      </div>
      <FieldMessages fieldId={inputId} hint={hint} error={error} />
    </div>
  );
}
